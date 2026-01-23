const socket = io({
  transports: ["websocket"]
});

// Client-side helper (UI only)
const USERS = {
  anshika: "1111",
  nishant: "2222",
  vipul: "3333",
  rohit: "4444",
  neha: "5555",
  aman: "6666"
};

const joinContainer = document.getElementById("join-container");
const chatContainer = document.getElementById("chat-container");
const joinBtn = document.getElementById("join-btn");
const sendBtn = document.getElementById("send-btn");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const messageInput = document.getElementById("message-input");
const messagesDiv = document.getElementById("messages");
const usersDiv = document.getElementById("users");
const joinError = document.getElementById("join-error");

// =====================
// JOIN CHAT
// =====================
joinBtn.onclick = () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert("Username and Password are required!");
    return;
  }

  if (!USERS[username]) {
    alert("❌ Invalid Username!");
    return;
  }

  if (USERS[username] !== password) {
    alert("❌ Wrong Password!");
    passwordInput.value = "";
    return;
  }

  // ✅ FIX 1: send username + password
  socket.emit("join", { username, password });
};

// =====================
// SERVER ERRORS
// =====================
socket.on("join_error", msg => {
  alert(msg);
});

socket.on("room_full", msg => {
  alert(msg);
});

// =====================
// MESSAGE HISTORY
// =====================
socket.on("message_history", messages => {
  messagesDiv.innerHTML = "";

  messages.forEach(msg => {
    addMessage(`${msg.username}: ${msg.text}`, msg.created_at);
  });

  joinContainer.classList.add("hidden");
  chatContainer.classList.remove("hidden");
});

// =====================
// SEND MESSAGE
// =====================
sendBtn.onclick = sendMessage;
messageInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg) return;

  socket.emit("message", msg);
  messageInput.value = "";
}

// =====================
// RECEIVE MESSAGE
// =====================
socket.on("message", data => {
  addMessage(`${data.user}: ${data.text}`, data.time);
});

// =====================
// USER EVENTS
// =====================
socket.on("user_joined", username => {
  addSystemMessage(`${username} joined`);
});

socket.on("user_left", username => {
  addSystemMessage(`${username} left`);
});

socket.on("users_list", users => {
  usersDiv.textContent = `Users (${users.length}/6): ${users.join(", ")}`;
});

// =====================
// HELPERS
// =====================
function addMessage(text, time) {
  const div = document.createElement("div");
  div.className = "message";

  if (time) {
    const timeStr = new Date(time).toLocaleTimeString();
    div.textContent = `${text} [${timeStr}]`;
  } else {
    div.textContent = text;
  }

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "message system";
  div.textContent = text;
  messagesDiv.appendChild(div);
}
