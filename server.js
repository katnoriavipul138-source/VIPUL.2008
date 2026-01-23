const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  transports: ["websocket", "polling"],
  cors: { origin: "*" }
});

// DB
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
  console.log("DB ready");
}

// STATIC
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// CHAT STATE
const users = new Map();
const MAX_USERS = 6;

// ✅ ONLY THESE USERS CAN LOGIN
const allowedUsers = {
  Vipul: "1111",
  Vishu: "2222",
  Anshika: "3333",
  Nishant: "4444",
  Hardik: "5555",
  Naman: "6666"
};

// SOCKET
io.on("connection", socket => {
  if (users.size >= MAX_USERS) {
    socket.emit("room_full", "Chat room full (max 6 users)");
    socket.disconnect();
    return;
  }

  socket.on("join", async ({ username, password }) => {
    if (!allowedUsers[username]) {
      socket.emit("join_error", "❌ Invalid username");
      return;
    }

    if (allowedUsers[username] !== password) {
      socket.emit("join_error", "❌ Wrong password");
      return;
    }

    users.set(socket.id, username);
    socket.emit("join_success");

    socket.broadcast.emit("user_joined", username);
    io.emit("users_list", Array.from(users.values()));

    const { rows } = await pool.query(
      `SELECT username, text, created_at
       FROM messages
       ORDER BY created_at ASC
       LIMIT 50`
    );

    socket.emit("message_history", rows);
  });

  socket.on("message", async msg => {
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
  });
});

// START
const PORT = process.env.PORT || 3000;
(async () => {
  await initDB();
  server.listen(PORT, () =>
    console.log("Server running on", PORT)
  );
})();
