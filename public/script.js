// ================================
// Socket connection
// ================================
const socket = io();

// ================================
// DOM Elements
// ================================
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

// ================================
// JOIN CHAT
// ================================
joinBtn.onclick = () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert("Username and Password are required");
    return;
  }

  socket.emit("join", { username, password });
};

// ================================
// JOIN SUCCESS
// ================================
socket.on("join_success", () => {
  joinContainer.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  joinError.innerText = "";
});

// ================================
// JOIN ERROR
// ================================
socket.on("join_error", (msg) => {
  joinError.innerText = msg;
});

// ================================
// MESSAGE HISTORY
// ================================
socket.on("message_history", (messages) => {
  messagesDiv.innerHTML = "";
  messages.forEach((msg) => {
    addMessage(msg.username, msg.text, msg.created_at);
  });
});

// ================================
// SEND MESSAGE
// ================================
sendBtn.onclick = () => {
  const msg = messageInput.value.trim();
  if (!msg) return;

  socket.emit("message", msg);
  messageInput.value = "";
};

// ================================
// RECEIVE MESSAGE
// ================================
socket.on("message", (data) => {
  addMessage(data.user, data.text, data.time);
});

// ================================
// USERS LIST
// ================================
socket.on("users_list", (users) => {
  usersDiv.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.innerText = user;
    usersDiv.appendChild(li);
  });
});

// ================================
// USER JOIN / LEAVE
// ================================
socket.on("user_joined", (username) => {
  addSystemMessage(`${username} joined the chat`);
});

socket.on("user_left", (username) => {
  addSystemMessage(`${username} left the chat`);
});

// ================================
// HELPERS
// ================================
function addMessage(user, text, time) {
  const div = document.createElement("div");
  div.classList.add("message");

  const t = time ? new Date(time).toLocaleTimeString() : "";
  div.innerText = `[${t}] ${user}: ${text}`;

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.classList.add("system-message");
  div.innerText = text;

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
