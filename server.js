const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const port = Number(process.env.PORT || 3001);
const root = __dirname;
const clients = new Map();
const queueByMode = new Map();
const rooms = new Map();

const modeNames = {
  classic: "Classic Ranked",
  casual: "Casual 1v1",
  speed: "Speed Battle",
  drip: "Drip Check",
  streamer: "Streamer Mode",
  tournament: "Tournament",
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  });
});

server.on("upgrade", (request, socket) => {
  if (request.url !== "/ws") {
    socket.destroy();
    return;
  }

  const key = request.headers["sec-websocket-key"];
  const accept = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      "",
    ].join("\r\n"),
  );

  const client = {
    id: crypto.randomUUID(),
    username: "Guest",
    socket,
    roomId: null,
    modeId: null,
    recentOpponents: [],
  };
  clients.set(client.id, client);
  broadcastStats();

  socket.on("data", (buffer) => {
    for (const message of decodeFrames(buffer)) {
      handleMessage(client, message);
    }
  });

  socket.on("close", () => removeClient(client));
  socket.on("error", () => removeClient(client));
});

function handleMessage(client, rawMessage) {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch {
    return;
  }

  if (message.type === "hello") {
    clients.delete(client.id);
    client.id = message.clientId || client.id;
    client.username = cleanName(message.username);
    clients.set(client.id, client);
    broadcastStats();
    return;
  }

  if (message.type === "profile-update") {
    client.username = cleanName(message.username);
    return;
  }

  if (message.type === "join-queue") {
    client.username = cleanName(message.username);
    joinQueue(client, message.modeId);
    return;
  }

  if (message.type === "cancel-queue") {
    removeFromQueues(client);
    send(client, { type: "queue-cancelled" });
    broadcastStats();
    return;
  }

  if (message.type === "signal") {
    relayToOpponent(client, message.roomId, { type: "signal", signal: message.signal });
    return;
  }

  if (message.type === "vote") {
    castVote(client, message.roomId, message.target);
    return;
  }

  if (message.type === "chat") {
    sendChat(client, message.roomId, message.text);
    return;
  }

  if (message.type === "end-battle") {
    endBattle(message.roomId);
    return;
  }

  if (message.type === "leave") {
    leaveRoom(client);
  }
}

function joinQueue(client, modeId = "classic") {
  leaveRoom(client);
  removeFromQueues(client);

  client.modeId = modeId;
  const queue = queueByMode.get(modeId) || [];
  const match = chooseOpponent(client, queue);
  const opponent = match.opponent;
  const nextQueue = match.remainingQueue;

  if (!opponent) {
    nextQueue.push(client);
    queueByMode.set(modeId, nextQueue);
    send(client, { type: "queued", modeId, modeName: getModeName(modeId) });
    broadcastStats();
    return;
  }

  queueByMode.set(modeId, nextQueue);
  createRoom(client, opponent, modeId);
  broadcastStats();
}

function isAvailableForMatch(client) {
  return Boolean(client && !client.socket.destroyed && !client.roomId && clients.has(client.id));
}

function chooseOpponent(client, queue) {
  const available = queue.filter((candidate) => isAvailableForMatch(candidate) && candidate.id !== client.id);
  const preferred = available.find((candidate) => !recentlyPlayed(client, candidate));
  const opponent = preferred || available[0] || null;
  const remainingQueue = queue.filter((candidate) => candidate !== opponent && isAvailableForMatch(candidate));
  return { opponent, remainingQueue };
}

function recentlyPlayed(a, b) {
  return a.recentOpponents.includes(b.id) || b.recentOpponents.includes(a.id);
}

function createRoom(a, b, modeId) {
  const roomId = crypto.randomUUID();
  const room = {
    id: roomId,
    modeId,
    players: [a.id, b.id],
    votes: { [a.id]: 0, [b.id]: 0 },
    ended: false,
  };

  rooms.set(roomId, room);
  a.roomId = roomId;
  b.roomId = roomId;
  rememberOpponent(a, b);
  rememberOpponent(b, a);

  send(a, {
    type: "match-found",
    roomId,
    modeId,
    modeName: getModeName(modeId),
    initiatorId: a.id,
    opponent: publicClient(b),
  });
  send(b, {
    type: "match-found",
    roomId,
    modeId,
    modeName: getModeName(modeId),
    initiatorId: a.id,
    opponent: publicClient(a),
  });
}

function getModeName(modeId) {
  if (modeId.startsWith("custom:")) return `Custom Private (${modeId.split(":")[1]})`;
  return modeNames[modeId] || "Battle";
}

function rememberOpponent(client, opponent) {
  client.recentOpponents = [opponent.id, ...client.recentOpponents.filter((id) => id !== opponent.id)].slice(0, 5);
}

function castVote(client, roomId, target) {
  const room = rooms.get(roomId);
  if (!room || room.ended) return;

  const targetId = target === "you" ? client.id : room.players.find((id) => id !== client.id);
  if (!targetId) return;

  room.votes[targetId] += 1;
  broadcastRoom(room, { type: "vote-update", votes: room.votes });
}

function sendChat(client, roomId, text) {
  const room = rooms.get(roomId);
  if (!room || !room.players.includes(client.id)) return;

  const cleanText = String(text || "").trim().slice(0, 90);
  if (!cleanText) return;

  broadcastRoom(room, {
    type: "chat",
    message: {
      clientId: client.id,
      username: client.username,
      text: cleanText,
      sentAt: Date.now(),
    },
  });
}

function endBattle(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.ended) return;

  room.ended = true;
  const [first, second] = room.players;
  const winnerId = room.votes[first] === room.votes[second] ? null : room.votes[first] > room.votes[second] ? first : second;
  broadcastRoom(room, { type: "battle-ended", winnerId, votes: room.votes });
}

function relayToOpponent(client, roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  const opponentId = room.players.find((id) => id !== client.id);
  const opponent = clients.get(opponentId);
  if (opponent) send(opponent, message);
}

function leaveRoom(client) {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (room) {
    relayToOpponent(client, room.id, { type: "opponent-left" });
    rooms.delete(room.id);
  }

  client.roomId = null;
}

function removeClient(client) {
  removeFromQueues(client);
  leaveRoom(client);
  clients.delete(client.id);
  broadcastStats();
}

function removeFromQueues(client) {
  for (const [modeId, queue] of queueByMode.entries()) {
    queueByMode.set(
      modeId,
      queue.filter((queuedClient) => queuedClient.id !== client.id),
    );
  }
}

function broadcastRoom(room, message) {
  room.players.forEach((clientId) => {
    const client = clients.get(clientId);
    if (client) send(client, message);
  });
}

function send(client, message) {
  if (!client || client.socket.destroyed) return;
  client.socket.write(encodeFrame(JSON.stringify(message)));
}

function broadcastStats() {
  const message = { type: "stats", online: clients.size, modes: getModeStats() };
  for (const client of clients.values()) {
    send(client, message);
  }
}

function getModeStats() {
  const stats = {};

  for (const modeId of Object.keys(modeNames)) {
    stats[modeId] = { queued: 0, inBattle: 0 };
  }
  stats.custom = { queued: 0, inBattle: 0 };

  for (const [modeId, queue] of queueByMode.entries()) {
    const key = modeId.startsWith("custom:") ? "custom" : modeId;
    if (!stats[key]) stats[key] = { queued: 0, inBattle: 0 };
    stats[key].queued += queue.filter(isAvailableForMatch).length;
  }

  for (const room of rooms.values()) {
    const key = room.modeId.startsWith("custom:") ? "custom" : room.modeId;
    if (!stats[key]) stats[key] = { queued: 0, inBattle: 0 };
    stats[key].inBattle += room.players.length;
  }

  return stats;
}

function publicClient(client) {
  return { id: client.id, username: client.username };
}

function cleanName(name) {
  const trimmed = String(name || "Guest").trim().slice(0, 18);
  return trimmed || "Guest";
}

function decodeFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const secondByte = buffer[offset + 1];
    const masked = (secondByte & 0x80) === 0x80;
    let length = secondByte & 0x7f;
    offset += 2;

    if (length === 126) {
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      length = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }

    const mask = masked ? buffer.subarray(offset, offset + 4) : null;
    if (masked) offset += 4;

    const payload = buffer.subarray(offset, offset + length);
    offset += length;

    const decoded = Buffer.alloc(length);
    for (let index = 0; index < length; index += 1) {
      decoded[index] = masked ? payload[index] ^ mask[index % 4] : payload[index];
    }
    messages.push(decoded.toString("utf8"));
  }

  return messages;
}

function encodeFrame(message) {
  const payload = Buffer.from(message);
  const length = payload.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x81, length]), payload]);
  }

  if (length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, payload]);
}

server.listen(port, () => {
  console.log(`Mog Royal MVP running at http://localhost:${port}`);
});
