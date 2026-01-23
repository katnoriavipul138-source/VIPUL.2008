// ================================
// Database initialization
// ================================
const { Pool } = require("pg");
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Database ready");
}

// ================================
// Server setup
// ================================
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================================
// Chat config
// ================================
const MAX_USERS = 6;
const users = new Map();

// ✅ FIXED USERS + PASSWORDS (YAHI FINAL HAI)
const allowedUsers = {
  Vipul: "1111",
  Vishu: "2222",
  Anshika: "3333",
  Nishant: "4444",
  Hardik: "5555",
  Naman: "6666"
};

// ================================
// Socket.io logic
// ================================
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join", async ({ username, password }) => {

    if (!allowedUsers[username]) {
      socket.emit("join_error", "❌ Invalid username");
      return;
    }

    if (allowedUsers[username] !== password) {
      socket.emit("join_error", "❌ Wrong password");
      return;
    }

    if (users.size >= MAX_USERS) {
      socket.emit("join_error", "❌ Room is full");
      return;
    }

    users.set(socket.id, username);

    socket.broadcast.emit("user_joined", username);
    io.emit("users_list", Array.from(users.values()));

    const { rows } = await pool.query(
      `SELECT username, text, created_at 
       FROM messages 
       ORDER BY created_at ASC 
       LIMIT 50`
    );

    socket.emit("message_history", rows);
    socket.emit("join_success");
  });

  socket.on("message", async (msg) => {
    const username = users.get(socket.id);
    if (!username) return;

    const result = await pool.query(
      `INSERT INTO messages (username, text)
       VALUES ($1, $2)
       RETURNING created_at`,
      [username, msg]
    );

    io.emit("message", {
      user: username,
      text: msg,
      time: result.rows[0].created_at
    });
  });

  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (!username) return;

    users.delete(socket.id);
    socket.broadcast.emit("user_left", username);
    io.emit("users_list", Array.from(users.values()));

    console.log("Disconnected:", socket.id);
  });
});

// ================================
// Start server
// ================================
const PORT = process.env.PORT || 3000;

(async () => {
  await initDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
