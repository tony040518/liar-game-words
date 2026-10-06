const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

const WORDS = [
  "火锅","医生","飞机","猫","海边","咖啡","电影","篮球","雨伞","旅行",
  "西瓜","手机","医院","老师","地铁","生日","游戏","老板","学校","音乐",
  "蛋糕","大海","火车","书店","机器人","烧烤","太阳","雪","自行车","相机",
  "奶茶","图书馆","公园","明星","耳机","夏天","冬天","考试","露营","跑步"
];

function roomId() {
  let id;
  do { id = crypto.randomBytes(3).toString("hex").toUpperCase(); }
  while (rooms.has(id));
  return id;
}

function publicRoom(room) {
  return {
    id: room.id,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    phase: room.phase,
    round: room.round,
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, connected: p.connected
    }))
  };
}

function broadcast(room) {
  io.to(room.id).emit("room:update", publicRoom(room));
}

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function distribute(room) {
  const players = [...room.players.values()];
  const pool = shuffled(WORDS);
  const need = players.length * 2;
  while (pool.length < need) pool.push(...shuffled(WORDS));
  players.forEach((p, i) => {
    p.words = [pool[i * 2], pool[i * 2 + 1]];
    io.to(p.id).emit("words:private", {
      words: p.words,
      round: room.round
    });
  });
  room.phase = "distributed";
  broadcast(room);
}

io.on("connection", socket => {
  socket.on("room:create", async ({name, maxPlayers}) => {
    const clean = String(name || "").trim().slice(0, 20);
    if (!clean) return socket.emit("error:msg", "请输入昵称");

    const room = {
      id: roomId(),
      hostId: socket.id,
      maxPlayers: Math.max(3, Math.min(12, Number(maxPlayers) || 8)),
      phase: "lobby",
      round: 0,
      players: new Map()
    };

    room.players.set(socket.id, {
      id: socket.id, name: clean, connected: true, words: []
    });
    rooms.set(room.id, room);
    socket.join(room.id);

    const base = process.env.PUBLIC_URL ||
      `${socket.handshake.headers["x-forwarded-proto"] || "http"}://${socket.handshake.headers.host}`;
    const joinUrl = `${base}/?room=${room.id}`;
    const qr = await QRCode.toDataURL(joinUrl, {margin: 1, width: 320});

    socket.emit("room:created", {room: publicRoom(room), qr, joinUrl});
    broadcast(room);
  });

  socket.on("room:join", ({roomId: id, name}) => {
    const room = rooms.get(String(id || "").trim().toUpperCase());
    const clean = String(name || "").trim().slice(0, 20);
    if (!room) return socket.emit("error:msg", "房间不存在");
    if (room.phase !== "lobby") return socket.emit("error:msg", "这个房间已经开始分发词语");
    if (!clean) return socket.emit("error:msg", "请输入昵称");
    if (room.players.size >= room.maxPlayers) return socket.emit("error:msg", "房间已满");

    room.players.set(socket.id, {
      id: socket.id, name: clean, connected: true, words: []
    });
    socket.join(room.id);
    socket.emit("room:joined", {room: publicRoom(room)});
    broadcast(room);
  });

  socket.on("game:start", ({roomId: id}) => {
    const room = rooms.get(id);
    if (!room || room.hostId !== socket.id || room.phase !== "lobby") return;
    if (room.players.size < 3)
      return socket.emit("error:msg", "至少需要3名玩家");
    room.round = 1;
    distribute(room);
  });

  socket.on("game:next", ({roomId: id}) => {
    const room = rooms.get(id);
    if (!room || room.hostId !== socket.id || room.phase !== "distributed") return;
    room.round += 1;
    distribute(room);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      if (!room.players.has(socket.id)) continue;
      if (room.phase === "lobby") {
        room.players.delete(socket.id);
        if (room.hostId === socket.id) {
          const next = room.players.values().next().value;
          if (next) room.hostId = next.id;
        }
      } else {
        room.players.get(socket.id).connected = false;
      }
      broadcast(room);
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Word distribution game: http://localhost:${port}`));
