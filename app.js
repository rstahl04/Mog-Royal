const modes = [
  {
    id: "classic",
    name: "Classic Ranked",
    timer: 10,
    ranked: true,
    status: "MVP",
    description: "Standard 1v1 battle with MMR, XP, streaks, and leaderboard impact.",
  },
  {
    id: "casual",
    name: "Casual 1v1",
    timer: 10,
    ranked: false,
    status: "MVP",
    description: "Same live face-off loop without rating loss. Best for onboarding.",
  },
  {
    id: "speed",
    name: "Speed Battle",
    timer: 10,
    ranked: true,
    status: "MVP",
    description: "Fast rounds built for short sessions and rapid rematches.",
  },
  {
    id: "drip",
    name: "Drip Check",
    timer: 10,
    ranked: false,
    status: "Next",
    description: "Style-focused battles where voters judge outfit, presentation, and vibe.",
  },
  {
    id: "streamer",
    name: "Streamer Mode",
    timer: 10,
    ranked: false,
    status: "Next",
    description: "A creator hosts repeated battles while spectators vote live.",
  },
  {
    id: "tournament",
    name: "Tournament",
    timer: 10,
    ranked: true,
    status: "Later",
    description: "Bracketed events for seasonal ladders, influencer nights, and communities.",
  },
  {
    id: "custom",
    name: "Custom Private",
    timer: 10,
    ranked: false,
    status: "MVP",
    description: "Private room-code battles with adjustable timer, chat, and rematch flow.",
  },
  {
    id: "solo",
    name: "Solo AI Scan",
    timer: 10,
    ranked: false,
    status: "Demo",
    description: "Practice mode with a simulated scan card for style, symmetry, and camera readiness.",
  },
];

const leaderboardData = [
  ["AstraKing", "Royal I", 1842, 72],
  ["VelvetAce", "Diamond II", 1710, 64],
  ["ChromeFit", "Diamond III", 1666, 59],
  ["RoyalYou", "Gold III", 1240, 18],
  ["LuxeLogic", "Gold IV", 1198, 15],
];

const state = {
  selectedMode: modes[0],
  customSettings: {
    roomCode: "",
    timer: 10,
    votesToWin: 1,
  },
  modeStats: {},
  authMode: "login",
  user: loadUser(),
  inQueue: false,
  inBattle: false,
  localStream: null,
  peer: null,
  socket: null,
  cameraEnabled: true,
  micEnabled: true,
  clientId: crypto.randomUUID(),
  roomId: null,
  role: "guest",
  opponentName: "Opponent",
  votes: { you: 0, opponent: 0 },
  mmr: 1000,
  xp: 0,
  streak: 0,
  wins: 0,
  losses: 0,
  reports: 2,
  timerId: null,
  queuePulseId: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  localVideo: $("#localVideo"),
  remoteVideo: $("#remoteVideo"),
  cameraPlaceholder: $("#cameraPlaceholder"),
  cameraButton: $("#cameraButton"),
  queueButton: $("#queueButton"),
  cancelQueueButton: $("#cancelQueueButton"),
  rematchButton: $("#rematchButton"),
  toggleCameraButton: $("#toggleCameraButton"),
  toggleMicButton: $("#toggleMicButton"),
  leaveBattleButton: $("#leaveBattleButton"),
  queueState: $("#queueState"),
  queueProgress: $("#queueProgress"),
  selectedModeLabel: $("#selectedModeLabel"),
  timer: $("#timer"),
  opponentName: $("#opponentName"),
  opponentFace: $("#opponentFace"),
  voteYou: $("#voteYou"),
  voteOpponent: $("#voteOpponent"),
  voteSummary: $("#voteSummary"),
  connectionStatus: $("#connectionStatus"),
  resultDialog: $("#resultDialog"),
  resultTitle: $("#resultTitle"),
  resultBody: $("#resultBody"),
  resultBurst: $("#resultBurst"),
  resultYouScore: $("#resultYouScore"),
  resultOpponentScore: $("#resultOpponentScore"),
  resultOpponentName: $("#resultOpponentName"),
  aiResultPanel: $("#aiResultPanel"),
  nextMatchButton: $("#nextMatchButton"),
  exitQueueButton: $("#exitQueueButton"),
  chatLog: $("#chatLog"),
  chatForm: $("#chatForm"),
  chatInput: $("#chatInput"),
  cameraCheck: $("#cameraCheck"),
  socketCheck: $("#socketCheck"),
  peerCheck: $("#peerCheck"),
  onlineCount: $("#onlineCount"),
  homeRankValue: $("#homeRankValue"),
  homeMmrValue: $("#homeMmrValue"),
  homeXpValue: $("#homeXpValue"),
  homeWinsValue: $("#homeWinsValue"),
  homeStreakValue: $("#homeStreakValue"),
  ageDialog: $("#ageDialog"),
  authDialog: $("#authDialog"),
  authOpenButton: $("#authOpenButton"),
  authTitle: $("#authTitle"),
  authSubmitButton: $("#authSubmitButton"),
  authNote: $("#authNote"),
  loginTabButton: $("#loginTabButton"),
  signupTabButton: $("#signupTabButton"),
  authUsernameInput: $("#authUsernameInput"),
  authEmailInput: $("#authEmailInput"),
  authPasswordInput: $("#authPasswordInput"),
  customRoomInput: $("#customRoomInput"),
  customTimerInput: $("#customTimerInput"),
  customVotesInput: $("#customVotesInput"),
  generateRoomButton: $("#generateRoomButton"),
  soloScanButton: $("#soloScanButton"),
  soloScanResult: $("#soloScanResult"),
};

let lastScrollY = window.scrollY;

function renderModes() {
  $("#modeGrid").innerHTML = modes
    .map((mode) => {
      const locked = !canUseMode(mode);
      return `
        <article class="mode-card ${mode.id === state.selectedMode.id ? "active" : ""} ${locked ? "locked" : ""}">
          <div class="mode-meta">
            <span>${mode.status}</span>
            <span>${mode.ranked ? "Ranked" : "Unranked"}</span>
            <span>${mode.timer}s</span>
            <span>${modeAudience(mode)} using</span>
            ${locked ? "<span>Account</span>" : ""}
          </div>
          <h4>${mode.name}</h4>
          <p>${mode.description}</p>
          <button class="${mode.id === state.selectedMode.id ? "primary" : ""}" data-mode="${mode.id}">
            ${locked ? "Sign Up to Unlock" : mode.id === state.selectedMode.id ? "Selected - Arena" : "Select Mode"}
          </button>
        </article>
      `;
    })
    .join("");

  $$("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => selectMode(button.dataset.mode));
  });
}

function renderLeaderboard() {
  $("#leaderboard").innerHTML = leaderboardData
    .map(
      ([name, rank, mmr, wins], index) => `
        <div class="leader-row">
          <div class="rank-num">#${index + 1}</div>
          <strong>${name}</strong>
          <span>${rank}</span>
          <span>${mmr} MMR / ${wins} W</span>
        </div>
      `,
    )
    .join("");
}

function renderHistory() {
  const rows = state.user
    ? [
        ["Placement Status", rankForStats(state), `${state.wins + state.losses} matches played`],
        ["Starter Stats", "New accounts begin Unranked", "1000 MMR, 0 XP, 0 wins"],
      ]
    : [
        ["Guest Mode", "Casual only", "Create an account to save progression"],
        ["Starter Stats", "New accounts begin Unranked", "1000 MMR, 0 XP, 0 wins"],
      ];

  $("#historyList").innerHTML = rows
    .map(
      ([mode, result, detail]) => `
        <article class="history-item">
          <h4>${mode}</h4>
          <p>${result} - ${detail}</p>
        </article>
      `,
    )
    .join("");
}

function selectMode(modeId) {
  if (state.inQueue || state.inBattle) {
    setStatus("Finish current session first");
    return;
  }

  state.selectedMode = modes.find((mode) => mode.id === modeId) || modes[0];
  if (state.selectedMode.id === "custom") {
    applyCustomSettings();
  }
  if (!canUseMode(state.selectedMode)) {
    openAuth("signup", `${state.selectedMode.name} needs an account. Guests can still play Casual 1v1.`);
    state.selectedMode = modes.find((mode) => mode.id === "casual") || modes[0];
  }
  elements.selectedModeLabel.textContent = state.selectedMode.name;
  elements.timer.textContent = formatTime(state.selectedMode.timer);
  renderModes();
  setStatus(`${state.selectedMode.name} selected`);
  if (state.selectedMode.id === "solo") {
    setStatus("Solo scan selected");
  } else {
    switchView("arena");
  }
}

async function enableCamera() {
  try {
    state.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    elements.localVideo.srcObject = state.localStream;
    elements.cameraPlaceholder.style.display = "none";
    setControlLabel(elements.cameraButton, "Camera", "Ready");
    elements.cameraButton.disabled = true;
    elements.queueButton.disabled = false;
    elements.toggleCameraButton.disabled = false;
    elements.toggleMicButton.disabled = false;
    state.cameraEnabled = true;
    state.micEnabled = true;
    updateReadiness();
    setStatus("Camera ready");
  } catch (error) {
    setStatus("Camera blocked");
    alert("Camera access is needed for live battles. You can still explore the prototype.");
  }
}

function connectSocket() {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    state.socket = new WebSocket(`${protocol}://${location.host}/ws`);

    state.socket.addEventListener("open", () => {
      sendSocket("hello", { clientId: state.clientId, username: getUsername() });
      updateReadiness();
      resolve();
    });

    state.socket.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data);
      await handleSocketMessage(message);
    });

    state.socket.addEventListener("close", () => {
      updateReadiness();
      if (state.inQueue || state.inBattle) {
        resetBattleState("Connection closed");
      }
    });

    state.socket.addEventListener("error", () => {
      setStatus("Socket error");
      reject(new Error("WebSocket connection failed"));
    });
  });
}

function sendSocket(type, payload = {}) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return;
  state.socket.send(JSON.stringify({ type, ...payload }));
}

async function joinQueue() {
  if (state.inQueue || state.inBattle) return;
  if (state.selectedMode.id === "solo") {
    runSoloScan();
    return;
  }
  if (state.selectedMode.id === "custom" && !getCustomRoomCode()) {
    switchView("modes");
    setStatus("Enter private room code");
    return;
  }
  if (!canUseMode(state.selectedMode)) {
    openAuth("signup", "Create an account to enter ranked and special modes. Guest play is limited to Casual 1v1.");
    return;
  }
  if (!state.localStream) {
    await enableCamera();
    if (!state.localStream) return;
  }

  await connectSocket();
  clearRemoteVideo();
  closePeer();

  state.inQueue = true;
  elements.queueButton.disabled = true;
  elements.cancelQueueButton.disabled = false;
  elements.rematchButton.disabled = true;
  elements.voteYou.disabled = true;
  elements.voteOpponent.disabled = true;
  elements.queueState.textContent = "Finding opponent";
  elements.queueProgress.style.width = "8%";
  elements.opponentName.textContent = "Opponent pending";
  elements.opponentFace.textContent = "??";
  setStatus("Searching");
  pulseQueue();

  sendSocket("join-queue", {
    clientId: state.clientId,
    username: getUsername(),
    modeId: getMatchModeId(),
  });
}

function cancelQueue() {
  if (!state.inQueue) return;
  sendSocket("cancel-queue");
  resetBattleState("Queue cancelled");
}

async function handleSocketMessage(message) {
  if (message.type === "queued") {
    elements.queueState.textContent = `Queued for ${message.modeName}`;
    return;
  }

  if (message.type === "stats") {
    elements.onlineCount.textContent = message.online;
    state.modeStats = message.modes || {};
    renderModes();
    return;
  }

  if (message.type === "queue-cancelled") {
    resetBattleState("Queue cancelled");
    return;
  }

  if (message.type === "match-found") {
    await startBattle(message);
    return;
  }

  if (message.type === "signal") {
    await handleSignal(message.signal);
    return;
  }

  if (message.type === "vote-update") {
    state.votes = normalizeVotes(message.votes);
    renderVotes();
    return;
  }

  if (message.type === "chat") {
    addChatMessage(message.message);
    return;
  }

  if (message.type === "battle-ended") {
    if (message.votes) state.votes = normalizeVotes(message.votes);
    finishBattle(message.winnerId);
    return;
  }

  if (message.type === "opponent-left") {
    resetBattleState("Opponent left");
  }
}

async function startBattle(match) {
  stopQueuePulse();
  state.inQueue = false;
  state.inBattle = true;
  state.roomId = match.roomId;
  state.role = match.initiatorId === state.clientId ? "caller" : "answerer";
  state.opponentName = match.opponent.username || "Opponent";
  state.votes = { you: 0, opponent: 0 };

  elements.opponentName.textContent = state.opponentName;
  elements.opponentFace.textContent = initialsFor(state.opponentName);
  elements.queueState.textContent = "Battle live";
  elements.queueProgress.style.width = "100%";
  elements.voteYou.disabled = false;
  elements.voteOpponent.disabled = false;
  elements.cancelQueueButton.disabled = true;
  elements.leaveBattleButton.disabled = false;
  elements.voteSummary.textContent = "Cast a vote before the timer ends.";
  clearChat();
  addSystemMessage(`Matched with ${state.opponentName} in ${state.selectedMode.name}.`);
  setStatus("Connecting video");

  createPeer();

  if (state.role === "caller") {
    const offer = await state.peer.createOffer();
    await state.peer.setLocalDescription(offer);
    sendSocket("signal", { roomId: state.roomId, signal: state.peer.localDescription });
  }

  let remaining = state.selectedMode.timer;
  elements.timer.textContent = formatTime(remaining);
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    remaining -= 1;
    elements.timer.textContent = formatTime(remaining);
    if (remaining <= 0) {
      sendSocket("end-battle", { roomId: state.roomId });
    }
  }, 1000);
}

function createPeer() {
  closePeer();
  state.peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  state.localStream.getTracks().forEach((track) => {
    state.peer.addTrack(track, state.localStream);
  });

  state.peer.addEventListener("track", (event) => {
    elements.remoteVideo.srcObject = event.streams[0];
    elements.remoteVideo.style.display = "block";
    elements.opponentFace.style.display = "none";
    setStatus("Video connected");
  });

  state.peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      sendSocket("signal", { roomId: state.roomId, signal: { candidate: event.candidate } });
    }
  });

  state.peer.addEventListener("connectionstatechange", () => {
    if (state.peer.connectionState === "connected") setStatus("Live video");
    if (state.peer.connectionState === "failed") setStatus("Peer connection failed");
    updateReadiness();
  });
}

async function handleSignal(signal) {
  if (!state.peer) createPeer();

  if (signal.type === "offer") {
    await state.peer.setRemoteDescription(signal);
    const answer = await state.peer.createAnswer();
    await state.peer.setLocalDescription(answer);
    sendSocket("signal", { roomId: state.roomId, signal: state.peer.localDescription });
    return;
  }

  if (signal.type === "answer") {
    await state.peer.setRemoteDescription(signal);
    return;
  }

  if (signal.candidate) {
    await state.peer.addIceCandidate(signal.candidate);
  }
}

function castVote(target) {
  if (!state.inBattle) return;
  sendSocket("vote", { roomId: state.roomId, target });
}

function sendChatMessage(text) {
  if (!state.inBattle) {
    addSystemMessage("Chat unlocks once a match starts.");
    return;
  }
  sendSocket("chat", { roomId: state.roomId, text });
}

function sendReaction(reaction) {
  sendChatMessage(`[${reaction}]`);
}

function addChatMessage(message) {
  const mine = message.clientId === state.clientId;
  const wrapper = document.createElement("div");
  wrapper.className = "chat-message";
  wrapper.innerHTML = `<strong>${mine ? "You" : escapeHtml(message.username)}</strong><span>${escapeHtml(message.text)}</span>`;
  elements.chatLog.appendChild(wrapper);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function addSystemMessage(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "chat-message system";
  wrapper.innerHTML = `<strong>Mog Royal</strong><span>${escapeHtml(text)}</span>`;
  elements.chatLog.appendChild(wrapper);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function clearChat() {
  elements.chatLog.innerHTML = "";
}

function normalizeVotes(votes) {
  const myVotes = votes[state.clientId] || 0;
  const opponentEntry = Object.entries(votes).find(([clientId]) => clientId !== state.clientId);
  return { you: myVotes, opponent: opponentEntry ? opponentEntry[1] : 0 };
}

function renderVotes() {
  elements.voteSummary.textContent = `You ${state.votes.you} - Opponent ${state.votes.opponent}`;
}

function finishBattle(winnerId) {
  if (!state.inBattle) return;

  clearInterval(state.timerId);
  state.inBattle = false;
  const tied = winnerId === null;
  const won = !tied && winnerId === state.clientId;
  const resultTone = getResultTone(won, state.votes.you, state.votes.opponent, tied);
  const mmrDelta = state.user && state.selectedMode.ranked && !tied ? (won ? 18 : -12) : 0;
  const xpDelta = tied ? 45 : won ? 90 : 35;

  state.mmr += mmrDelta;
  state.xp += xpDelta;
  state.streak = tied ? state.streak : won ? state.streak + 1 : 0;
  state.wins += won ? 1 : 0;
  state.losses += !won && !tied ? 1 : 0;

  updateStats();
  persistCurrentStats();
  elements.voteYou.disabled = true;
  elements.voteOpponent.disabled = true;
  elements.leaveBattleButton.disabled = true;
  elements.queueButton.disabled = false;
  elements.rematchButton.disabled = false;
  elements.queueState.textContent = "Complete";
  setStatus("Results ready");

  elements.resultBurst.textContent = resultTone.burst;
  elements.resultTitle.textContent = resultTone.title;
  elements.resultBody.textContent = `${resultTone.body} ${state.selectedMode.name}: ${mmrDelta >= 0 ? "+" : ""}${mmrDelta} MMR, +${xpDelta} XP.`;
  elements.resultYouScore.textContent = state.votes.you;
  elements.resultOpponentScore.textContent = state.votes.opponent;
  elements.resultOpponentName.textContent = state.opponentName;
  renderBattleAiRatings();
  elements.resultDialog.showModal();
  addSystemMessage(tied ? "Result posted: tied round. No MMR lost." : won ? "Result posted: you won." : "Result posted: opponent won.");
}

function getResultTone(won, yourVotes, opponentVotes, tied = false) {
  const margin = Math.abs(yourVotes - opponentVotes);
  const totalVotes = yourVotes + opponentVotes;

  if (tied) {
    return { burst: "Dead Even", title: "Tie Round", body: "No winner, no loser, no MMR lost." };
  }

  if (totalVotes === 0) {
    return { burst: "Dead Even", title: "Tie Round", body: "No votes came in, so the round stayed even." };
  }

  if (margin === 0) {
    return { burst: "Photo Finish", title: "Tie Round", body: "That one was even until the final call." };
  }

  if (margin === 1) {
    return won
      ? { burst: "Clutch Win", title: "You Edged It", body: "One vote decided the match." }
      : { burst: "Close Loss", title: "Barely Missed", body: "One vote decided the match." };
  }

  if (margin <= 3) {
    return won
      ? { burst: "Clean Win", title: "Solid Victory", body: "You controlled the round without running away with it." }
      : { burst: "Respectable Loss", title: "Competitive Defeat", body: "You kept it close, but they pulled ahead." };
  }

  return won
    ? { burst: "Brutalized", title: "Dominant Victory", body: "That round was not close." }
    : { burst: "Overpowered", title: "Dominant Defeat", body: "That round got away fast." };
}

function queueFromResults() {
  elements.resultDialog.close();
  resetBattleState("Queueing next");
  joinQueue();
}

function exitFromResults() {
  elements.resultDialog.close();
  resetBattleState("Exited queue");
  switchView("arena");
}

function resetBattleState(reason) {
  stopQueuePulse();
  clearInterval(state.timerId);
  state.inQueue = false;
  state.inBattle = false;
  state.roomId = null;
  state.votes = { you: 0, opponent: 0 };
  elements.queueButton.disabled = !state.localStream;
  elements.cancelQueueButton.disabled = true;
  elements.rematchButton.disabled = true;
  elements.leaveBattleButton.disabled = true;
  elements.voteYou.disabled = true;
  elements.voteOpponent.disabled = true;
  elements.queueState.textContent = reason;
  elements.queueProgress.style.width = "0%";
  elements.voteSummary.textContent = "Votes unlock after a match starts.";
  clearRemoteVideo();
  closePeer();
  updateReadiness();
  setStatus(reason);
}

function closePeer() {
  if (state.peer) {
    state.peer.close();
    state.peer = null;
  }
}

function clearRemoteVideo() {
  elements.remoteVideo.srcObject = null;
  elements.remoteVideo.style.display = "none";
  elements.opponentFace.style.display = "grid";
}

function pulseQueue() {
  stopQueuePulse();
  let progress = 8;
  state.queuePulseId = setInterval(() => {
    progress = Math.min(progress + 9, 92);
    elements.queueProgress.style.width = `${progress}%`;
  }, 550);
}

function stopQueuePulse() {
  clearInterval(state.queuePulseId);
}

function updateStats() {
  $("#mmrValue").textContent = state.mmr;
  $("#xpValue").textContent = state.xp;
  $("#streakValue").textContent = state.streak;
  $("#winsValue").textContent = state.wins;
  updateHomeStats();
}

function updateHomeStats() {
  const rank = state.user ? rankForStats(state) : "Guest";
  elements.homeRankValue.textContent = rank;
  elements.homeMmrValue.textContent = state.user ? state.mmr : "Casual";
  elements.homeXpValue.textContent = state.xp;
  elements.homeWinsValue.textContent = state.wins;
  elements.homeStreakValue.textContent = state.streak;
}

function toggleCamera() {
  if (!state.localStream) return;
  state.cameraEnabled = !state.cameraEnabled;
  state.localStream.getVideoTracks().forEach((track) => {
    track.enabled = state.cameraEnabled;
  });
  setMiniControlLabel(elements.toggleCameraButton, state.cameraEnabled ? "Camera On" : "Camera Off");
  updateReadiness();
}

function toggleMic() {
  if (!state.localStream) return;
  state.micEnabled = !state.micEnabled;
  state.localStream.getAudioTracks().forEach((track) => {
    track.enabled = state.micEnabled;
  });
  setMiniControlLabel(elements.toggleMicButton, state.micEnabled ? "Mic On" : "Mic Off");
}

function leaveBattle() {
  if (!state.inBattle && !state.inQueue) return;
  sendSocket("leave", { roomId: state.roomId });
  resetBattleState("Left session");
}

function updateReadiness() {
  setCheck(elements.cameraCheck, Boolean(state.localStream && state.cameraEnabled), state.localStream ? "Camera ready" : "Camera not enabled");
  setCheck(elements.socketCheck, Boolean(state.socket && state.socket.readyState === WebSocket.OPEN), state.socket && state.socket.readyState === WebSocket.OPEN ? "Signaling online" : "Signaling offline");
  setCheck(elements.peerCheck, Boolean(state.peer && state.peer.connectionState === "connected"), state.peer && state.peer.connectionState === "connected" ? "Peer connected" : "Peer not connected");
}

function setCheck(element, ready, text) {
  element.classList.toggle("ready", ready);
  element.lastChild.textContent = ` ${text}`;
}

function setControlLabel(button, title, subtitle) {
  const label = button.querySelector("span:last-child");
  if (!label) return;
  label.innerHTML = `<strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small>`;
}

function setMiniControlLabel(button, text) {
  const textNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.textContent = ` ${text}`;
}

function saveProfile() {
  if (!state.user) {
    openAuth("signup", "Create an account to save profile changes.");
    return;
  }
  const username = getUsername();
  $("#profileName").textContent = username;
  $("#profileInitials").textContent = initialsFor(username);
  sendSocket("profile-update", { clientId: state.clientId, username });
  setStatus("Profile saved");
}

function getUsername() {
  return $("#usernameInput").value.trim() || state.user?.username || "Guest";
}

function initialsFor(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "?");
}

function setStatus(text) {
  elements.connectionStatus.textContent = text;
}

function formatTime(seconds) {
  return `00:${String(seconds).padStart(2, "0")}`;
}

function switchView(viewName) {
  $$(".view").forEach((view) => view.classList.remove("active"));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  $(`#${viewName}View`).classList.add("active");
  $("#viewTitle").textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
}

function reportOpponent() {
  state.reports += 1;
  $("#reportCount").textContent = state.reports;
  sendSocket("report", { roomId: state.roomId, opponentName: state.opponentName });
  setStatus("Report filed");
}

function showGuidelines() {
  alert("Mog Royal MVP rules: be 18+, keep clothing on, no harassment, no hate speech, no recording or sharing without consent.");
}

function startFromHome() {
  switchView("arena");
  enableCamera();
}

function getMatchModeId() {
  if (state.selectedMode.id !== "custom") return state.selectedMode.id;
  return `custom:${getCustomRoomCode()}`;
}

function getCustomRoomCode() {
  return elements.customRoomInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function applyCustomSettings() {
  state.customSettings.roomCode = getCustomRoomCode();
  state.customSettings.timer = Number(elements.customTimerInput.value || 10);
  state.customSettings.votesToWin = Number(elements.customVotesInput.value || 1);
  state.selectedMode.timer = state.customSettings.timer;
  elements.selectedModeLabel.textContent = `Custom Private ${state.customSettings.roomCode ? `(${state.customSettings.roomCode})` : ""}`;
  elements.timer.textContent = formatTime(state.selectedMode.timer);
}

function generateRoomCode() {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  elements.customRoomInput.value = code;
  applyCustomSettings();
  selectMode("custom");
}

async function runSoloScan() {
  if (!state.localStream) {
    await enableCamera();
    if (!state.localStream) return;
  }

  switchView("modes");
  setStatus("Scanning");
  elements.soloScanResult.innerHTML = `
    <div class="scan-card scanning">
      <strong>Scanning...</strong>
      <span>Hold steady for a clean camera read.</span>
    </div>
  `;

  window.setTimeout(() => {
    const rating = buildAiRating(elements.localVideo, "solo");
    elements.soloScanResult.innerHTML = `
      <div class="scan-card">
        <div class="scan-score">${rating.overall}</div>
        <strong>${rating.statement}</strong>
        <p>${rating.summary}</p>
        <div class="scan-bars">
          ${rating.metrics.map((metric) => scanMetric(metric.label, metric.score)).join("")}
        </div>
        <small>Entertainment rating only. No race, gender, sexuality, age, religion, nationality, disability, or body-type judgments.</small>
      </div>
    `;
    setStatus("Solo scan complete");
  }, 1200);
}

function scanMetric(label, value) {
  return `
    <div class="scan-metric">
      <span>${label}</span>
      <strong>${value}</strong>
      <div><i style="width:${value}%"></i></div>
    </div>
  `;
}

function renderBattleAiRatings() {
  if (!shouldRunAiRating()) {
    elements.aiResultPanel.innerHTML = `
      <div class="ai-disabled">
        AI rating skipped for Drip Check. This mode is judged by style votes only.
      </div>
    `;
    return;
  }

  const yourRating = buildAiRating(elements.localVideo, "you");
  const opponentRating = elements.remoteVideo.srcObject
    ? buildAiRating(elements.remoteVideo, "opponent")
    : buildFallbackAiRating("opponent");

  elements.aiResultPanel.innerHTML = `
      <div class="ai-panel-head">
      <span class="eyebrow">AI Mog Score</span>
      <p>Subjective entertainment scan using landmark-inspired geometry: harmony 25%, symmetry 20%, eye area 15%, jawline 15%, midface 10%, grooming/style 10%, confidence/expression 5%.</p>
    </div>
    <div class="ai-rating-grid">
      ${aiRatingCard("You", yourRating)}
      ${aiRatingCard(state.opponentName, opponentRating)}
    </div>
    <small>Respectful mode: no protected-class assumptions, no age estimates, no insults, no body shaming.</small>
  `;
}

function shouldRunAiRating() {
  return state.selectedMode.id !== "drip";
}

function aiRatingCard(name, rating) {
  return `
    <article class="ai-rating-card">
      <div class="ai-score">${rating.overall}</div>
      <strong>${escapeHtml(name)}</strong>
      <p>${rating.summary}</p>
      <div class="scan-bars">
        ${rating.metrics.map((metric) => scanMetric(metric.label, metric.score)).join("")}
      </div>
    </article>
  `;
}

function buildAiRating(video, seedLabel) {
  const signal = getVideoSignal(video);
  const seed = seededNoise(`${state.clientId}-${seedLabel}-${state.wins}-${state.losses}`);
  const clarityBonus = Math.round(signal.clarity * 16);
  const lightingBonus = Math.round(signal.lighting * 14);
  const balanceBonus = Math.round(signal.balance * 10);
  const metrics = buildAiMetrics(seed, clarityBonus, lightingBonus, balanceBonus);
  const overallRaw = metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0);
  const overall = toTenPointScore(overallRaw);

  return {
    metrics,
    overall,
    statement: aiStatement(overall),
    summary: aiSummary(overall),
  };
}

function buildFallbackAiRating(seedLabel) {
  const seed = seededNoise(`${state.roomId}-${seedLabel}-${state.opponentName}`);
  const metrics = buildAiMetrics(seed, 7, 7, 7);
  const overallRaw = metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0);
  const overall = toTenPointScore(overallRaw);
  return {
    metrics,
    overall,
    statement: aiStatement(overall),
    summary: aiSummary(overall),
  };
}

function buildAiMetrics(seed, clarityBonus, lightingBonus, balanceBonus) {
  return [
    { label: "Facial harmony", weight: 0.25, score: clampScore(66 + balanceBonus + clarityBonus + Math.round(seed * 10)) },
    { label: "Symmetry", weight: 0.2, score: clampScore(68 + balanceBonus + Math.round(seed * 9)) },
    { label: "Eye area", weight: 0.15, score: clampScore(64 + clarityBonus + Math.round(seed * 11)) },
    { label: "Jawline", weight: 0.15, score: clampScore(63 + clarityBonus + balanceBonus + Math.round(seed * 9)) },
    { label: "Midface ratio", weight: 0.1, score: clampScore(65 + balanceBonus + Math.round(seed * 8)) },
    { label: "Grooming/style", weight: 0.1, score: clampScore(66 + lightingBonus + clarityBonus + Math.round(seed * 6)) },
    { label: "Confidence", weight: 0.05, score: clampScore(64 + lightingBonus + balanceBonus + Math.round(seed * 10)) },
  ];
}

function getVideoSignal(video) {
  try {
    if (!video || video.readyState < 2) return { clarity: 0.45, lighting: 0.45, balance: 0.45 };
    const canvas = document.createElement("canvas");
    const width = 96;
    const height = 72;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(video, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    let brightness = 0;
    let contrast = 0;
    let centerBrightness = 0;
    let edgeBrightness = 0;
    let centerCount = 0;
    let edgeCount = 0;
    const values = [];

    for (let index = 0; index < data.length; index += 4) {
      const pixel = (data[index] + data[index + 1] + data[index + 2]) / 3;
      values.push(pixel);
      brightness += pixel;
      const pixelIndex = index / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      const inCenter = x > width * 0.28 && x < width * 0.72 && y > height * 0.18 && y < height * 0.82;
      if (inCenter) {
        centerBrightness += pixel;
        centerCount += 1;
      } else {
        edgeBrightness += pixel;
        edgeCount += 1;
      }
    }

    brightness /= values.length;
    for (const value of values) contrast += Math.abs(value - brightness);
    contrast /= values.length;
    const lighting = 1 - Math.min(Math.abs(brightness - 142) / 142, 1);
    const clarity = Math.min(contrast / 64, 1);
    const center = centerBrightness / Math.max(centerCount, 1);
    const edge = edgeBrightness / Math.max(edgeCount, 1);
    const balance = 1 - Math.min(Math.abs(center - edge) / 120, 1);
    return { clarity, lighting, balance };
  } catch {
    return { clarity: 0.45, lighting: 0.45, balance: 0.45 };
  }
}

function clampScore(value) {
  return Math.max(40, Math.min(99, value));
}

function toTenPointScore(value) {
  return (Math.max(1, Math.min(10, value / 10))).toFixed(1);
}

function seededNoise(seedText) {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function aiStatement(score) {
  const numericScore = Number(score);
  if (numericScore >= 9.2) return "Royal Ready";
  if (numericScore >= 8.4) return "Clean Harmony";
  if (numericScore >= 7.6) return "Battle Ready";
  if (numericScore >= 6.8) return "Solid Read";
  return "Needs Better Lighting";
}

function aiSummary(score) {
  const numericScore = Number(score);
  if (numericScore >= 9.2) return "Strong harmony read and polished presentation.";
  if (numericScore >= 8.4) return "Balanced scan with confident on-camera presence.";
  if (numericScore >= 7.6) return "Good entertainment score with room to sharpen presentation.";
  if (numericScore >= 6.8) return "Solid scan, likely helped by better lighting or framing.";
  return "Try brighter lighting, a steadier camera, and a clearer expression.";
}

function showAgeGate() {
  if (localStorage.getItem("mogroyal-age-ok") === "true") return;
  elements.ageDialog.showModal();
}

function canUseMode(mode) {
  return Boolean(state.user) || mode.id === "casual";
}

function modeAudience(mode) {
  if (mode.id === "solo") return "solo";
  const stats = state.modeStats[mode.id] || { queued: 0, inBattle: 0 };
  return `${stats.queued + stats.inBattle}`;
}

function loadUser() {
  try {
    return JSON.parse(localStorage.getItem("mogroyal-user"));
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem("mogroyal-user", JSON.stringify(user));
}

function openAuth(mode = "login", note) {
  state.authMode = mode;
  elements.authTitle.textContent = mode === "signup" ? "Sign Up" : "Log In";
  elements.authSubmitButton.textContent = mode === "signup" ? "Create Account" : "Log In";
  elements.loginTabButton.classList.toggle("active", mode === "login");
  elements.signupTabButton.classList.toggle("active", mode === "signup");
  elements.authNote.textContent =
    note || "Accounts unlock ranked modes, persistent progression, and profile features in this MVP.";
  elements.authPasswordInput.autocomplete = mode === "signup" ? "new-password" : "current-password";
  if (!elements.authDialog.open) elements.authDialog.showModal();
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const username = elements.authUsernameInput.value.trim() || "RoyalYou";
  const email = elements.authEmailInput.value.trim();
  const existingUser = loadUserByEmail(email);
  const user =
    state.authMode === "login" && existingUser
      ? existingUser
      : {
          username,
          email,
          createdAt: Date.now(),
          stats: getStarterStats(),
        };
  state.user = user;
  saveUser(user);
  saveUserByEmail(user);
  $("#usernameInput").value = username;
  $("#profileName").textContent = username;
  $("#profileInitials").textContent = initialsFor(username);
  elements.authDialog.close();
  applyAuthState();
  setStatus("Signed in");
}

function logout() {
  localStorage.removeItem("mogroyal-user");
  state.user = null;
  state.selectedMode = modes.find((mode) => mode.id === "casual") || modes[0];
  applyStats(getGuestStats());
  elements.selectedModeLabel.textContent = state.selectedMode.name;
  applyAuthState();
  renderModes();
  renderHistory();
  setStatus("Guest mode");
}

function applyAuthState() {
  if (state.user) {
    elements.authOpenButton.textContent = state.user.username;
    $("#profileName").textContent = state.user.username;
    $("#profileInitials").textContent = initialsFor(state.user.username);
    $("#usernameInput").value = state.user.username;
    applyStats(state.user.stats || getStarterStats());
    $("#profileRank").textContent = rankForStats(state);
  } else {
    elements.authOpenButton.textContent = "Log In / Sign Up";
    $("#profileName").textContent = "Guest";
    $("#profileInitials").textContent = "GU";
    $("#profileRank").textContent = "Casual only";
    applyStats(getGuestStats());
    state.selectedMode = modes.find((mode) => mode.id === "casual") || modes[0];
    elements.selectedModeLabel.textContent = state.selectedMode.name;
  }
  renderModes();
  renderHistory();
}

function getStarterStats() {
  return {
    rank: "Unranked",
    mmr: 1000,
    xp: 0,
    streak: 0,
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    placementMatchesRemaining: 5,
  };
}

function getGuestStats() {
  return {
    rank: "Guest",
    mmr: 0,
    xp: 0,
    streak: 0,
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    placementMatchesRemaining: 5,
  };
}

function applyStats(stats) {
  state.mmr = stats.mmr;
  state.xp = stats.xp;
  state.streak = stats.streak;
  state.wins = stats.wins;
  state.losses = stats.losses;
  updateStats();
}

function persistCurrentStats() {
  if (!state.user) return;
  state.user.stats = {
    rank: rankForStats(state),
    mmr: state.mmr,
    xp: state.xp,
    streak: state.streak,
    wins: state.wins,
    losses: state.losses,
    matchesPlayed: state.wins + state.losses,
    placementMatchesRemaining: Math.max(0, 5 - (state.wins + state.losses)),
  };
  saveUser(state.user);
  saveUserByEmail(state.user);
  $("#profileRank").textContent = state.user.stats.rank;
}

function rankForStats(stats) {
  const matchesPlayed = stats.wins + stats.losses;
  if (matchesPlayed < 5) return `Unranked (${5 - matchesPlayed} placements)`;
  if (stats.mmr < 900) return "Bronze I";
  if (stats.mmr < 1100) return "Bronze II";
  if (stats.mmr < 1300) return "Silver I";
  if (stats.mmr < 1500) return "Gold I";
  if (stats.mmr < 1700) return "Diamond I";
  return "Royal";
}

function loadUserByEmail(email) {
  try {
    const users = JSON.parse(localStorage.getItem("mogroyal-users") || "{}");
    return users[email] || null;
  } catch {
    return null;
  }
}

function saveUserByEmail(user) {
  const users = JSON.parse(localStorage.getItem("mogroyal-users") || "{}");
  users[user.email] = user;
  localStorage.setItem("mogroyal-users", JSON.stringify(users));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}

function handleHeaderScroll() {
  const currentY = window.scrollY;
  const scrollingDown = currentY > lastScrollY;
  const shouldCollapse = currentY > 120 && scrollingDown;
  const shouldReveal = currentY < 72 || !scrollingDown;

  if (shouldCollapse) document.body.classList.add("header-collapsed");
  if (shouldReveal) document.body.classList.remove("header-collapsed");

  lastScrollY = currentY;
}

elements.cameraButton.addEventListener("click", enableCamera);
elements.authOpenButton.addEventListener("click", () => {
  if (state.user) {
    logout();
    return;
  }
  openAuth("login");
});
elements.loginTabButton.addEventListener("click", () => openAuth("login"));
elements.signupTabButton.addEventListener("click", () => openAuth("signup"));
$("#authForm").addEventListener("submit", handleAuthSubmit);
$("#authCancelButton").addEventListener("click", () => elements.authDialog.close());
$("#homeStartButton").addEventListener("click", startFromHome);
$("#homeLeaderboardButton").addEventListener("click", () => switchView("leaderboard"));
$("#confirmAgeButton").addEventListener("click", () => {
  localStorage.setItem("mogroyal-age-ok", "true");
  elements.ageDialog.close();
});
$("#underAgeButton").addEventListener("click", () => {
  elements.ageDialog.close();
  setStatus("Adults only");
});
elements.queueButton.addEventListener("click", joinQueue);
elements.generateRoomButton.addEventListener("click", generateRoomCode);
elements.customRoomInput.addEventListener("input", applyCustomSettings);
elements.customTimerInput.addEventListener("input", applyCustomSettings);
elements.customVotesInput.addEventListener("input", applyCustomSettings);
elements.soloScanButton.addEventListener("click", runSoloScan);
elements.cancelQueueButton.addEventListener("click", cancelQueue);
elements.rematchButton.addEventListener("click", joinQueue);
elements.toggleCameraButton.addEventListener("click", toggleCamera);
elements.toggleMicButton.addEventListener("click", toggleMic);
elements.leaveBattleButton.addEventListener("click", leaveBattle);
elements.voteYou.addEventListener("click", () => castVote("you"));
elements.voteOpponent.addEventListener("click", () => castVote("opponent"));
elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.chatInput.value.trim();
  if (!text) return;
  sendChatMessage(text);
  elements.chatInput.value = "";
});
$$("[data-reaction]").forEach((button) => {
  button.addEventListener("click", () => sendReaction(button.dataset.reaction));
});
elements.nextMatchButton.addEventListener("click", queueFromResults);
elements.exitQueueButton.addEventListener("click", exitFromResults);
$("#saveProfileButton").addEventListener("click", saveProfile);
$("#reportButton").addEventListener("click", reportOpponent);
$("#blockButton").addEventListener("click", () => resetBattleState("Opponent blocked"));
$("#guidelinesButton").addEventListener("click", showGuidelines);

$$(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

window.addEventListener("beforeunload", () => {
  sendSocket("leave", { roomId: state.roomId });
});
window.addEventListener("scroll", handleHeaderScroll, { passive: true });

renderModes();
renderLeaderboard();
renderHistory();
updateStats();
clearRemoteVideo();
clearChat();
addSystemMessage("Enable camera, pick a mode, then join queue in two tabs to test live battles.");
updateReadiness();
applyAuthState();
showAgeGate();
connectSocket().catch(() => setStatus("Signaling offline"));
