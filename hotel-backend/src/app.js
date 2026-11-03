const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PENDING = "Menunggu Pembayaran";
const PAID = "Lunas";
const CANCELED = "Dibatalkan";
const METHODS = ["Transfer Bank (BCA)", "QRIS", "Kartu Kredit"];
const nights = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const validDate = (s) => typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(s));

function createApp(db, secret = process.env.JWT_SECRET || "ganti-rahasia-ini") {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  const fail = (res, code, msg) => res.status(code).json({ error: msg });
  const signToken = (u) => jwt.sign({ sub: u.id }, secret, { expiresIn: "2h" });
  const session = (u) => ({ token: signToken(u), user: { name: u.name, email: u.email } });

  const BOOKING_SQL = "SELECT b.*, r.name AS room FROM bookings b JOIN rooms r ON r.id = b.room_id";
  const shape = (b, email) => ({
    id: b.id, u: email, code: "HN" + String(b.id).padStart(6, "0"), room: b.room,
    in: b.check_in, out: b.check_out, n: b.nights, g: b.guests, total: b.total, st: b.status, m: b.method || "",
  });
  const getBooking = (id, userId) => db.prepare(BOOKING_SQL + " WHERE b.id = ? AND b.user_id = ?").get(id, userId);
  const used = (roomId, ci, co) => db.prepare(
    "SELECT COUNT(*) AS c FROM bookings WHERE room_id = ? AND status != ? AND check_in < ? AND check_out > ?"
  ).get(roomId, CANCELED, co, ci).c;

  function auth(req, res, next) {
    try {
      const p = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), secret);
      const u = db.prepare("SELECT * FROM users WHERE id = ?").get(p.sub);
      if (!u) throw new Error("no user");
      req.user = u;
      next();
    } catch {
      fail(res, 401, "Sesi berakhir, silakan login ulang");
    }
  }

  // ---- Auth ----
  app.post("/api/register", (req, res) => {
    const { name = "", email = "", password = "" } = req.body || {};
    const em = String(email).trim().toLowerCase();
    if (String(name).trim().length < 3 || !/^\S+@\S+\.\S+$/.test(em) || String(password).length < 6)
      return fail(res, 400, "Isi nama (min 3), email valid, dan sandi minimal 6 karakter");
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(em)) return fail(res, 409, "Email sudah terdaftar");
    const id = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?,?,?)")
      .run(String(name).trim(), em, bcrypt.hashSync(String(password), 10)).lastInsertRowid;
    res.status(201).json(session(db.prepare("SELECT * FROM users WHERE id = ?").get(id)));
  });

  app.post("/api/login", (req, res) => {
    const { email = "", password = "" } = req.body || {};
    const u = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).trim().toLowerCase());
    if (!u || !bcrypt.compareSync(String(password), u.password_hash))
      return fail(res, 401, "Email atau kata sandi salah");
    res.json(session(u));
  });

  app.get("/api/me", auth, (req, res) => res.json({ name: req.user.name, email: req.user.email }));

  // ---- Kamar ----
  app.get("/api/rooms", (req, res) => {
    const { in: ci, out: co, guests } = req.query;
    const withDates = validDate(ci) && validDate(co) && nights(ci, co) > 0;
    const rooms = db.prepare("SELECT * FROM rooms WHERE capacity >= ? ORDER BY price").all(Number(guests) || 1);
    res.json(rooms.map((r) => ({ ...r, available: withDates ? r.stock - used(r.id, ci, co) : r.stock })));
  });

  // ---- Pemesanan ----
  app.get("/api/bookings", auth, (req, res) => {
    const rows = db.prepare(BOOKING_SQL + " WHERE b.user_id = ? ORDER BY b.id").all(req.user.id);
    res.json(rows.map((b) => shape(b, req.user.email)));
  });

  app.get("/api/bookings/:id", auth, (req, res) => {
    const b = getBooking(req.params.id, req.user.id);
    if (!b) return fail(res, 404, "Pemesanan tidak ditemukan");
    res.json(shape(b, req.user.email));
  });

  app.post("/api/bookings", auth, (req, res) => {
    const { room, in: ci, out: co, guests } = req.body || {};
    const r = db.prepare("SELECT * FROM rooms WHERE id = ?").get(Number(room));
    if (!r) return fail(res, 400, "Kamar tidak ditemukan");
    if (!validDate(ci) || !validDate(co)) return fail(res, 400, "Format tanggal harus YYYY-MM-DD");
    if (ci < new Date().toISOString().slice(0, 10)) return fail(res, 400, "Tanggal check-in tidak boleh di masa lalu");
    const n = nights(ci, co);
    if (!(n > 0)) return fail(res, 400, "Tanggal check-out harus setelah check-in");
    if (!Number.isInteger(guests) || guests < 1 || guests > r.capacity)
      return fail(res, 400, "Jumlah tamu melebihi kapasitas kamar");
    const create = db.transaction(() => {
      if (used(r.id, ci, co) >= r.stock) return null; // penuh pada rentang tanggal tsb
      const id = db.prepare(
        "INSERT INTO bookings (user_id, room_id, check_in, check_out, nights, guests, total) VALUES (?,?,?,?,?,?,?)"
      ).run(req.user.id, r.id, ci, co, n, guests, Math.round(r.price * n * 1.1)).lastInsertRowid;
      return getBooking(id, req.user.id);
    });
    const b = create();
    if (!b) return fail(res, 409, "Kamar tidak tersedia pada tanggal tersebut");
    res.status(201).json(shape(b, req.user.email));
  });

  app.post("/api/bookings/:id/pay", auth, (req, res) => {
    const b = getBooking(req.params.id, req.user.id);
    if (!b) return fail(res, 404, "Pemesanan tidak ditemukan");
    if (b.status !== PENDING) return fail(res, 400, "Pemesanan tidak bisa dibayar");
    const method = (req.body || {}).method;
    if (!METHODS.includes(method)) return fail(res, 400, "Metode pembayaran tidak valid");
    db.prepare("UPDATE bookings SET status = ?, method = ? WHERE id = ?").run(PAID, method, b.id); // simulasi
    res.json(shape(getBooking(b.id, req.user.id), req.user.email));
  });

  app.post("/api/bookings/:id/cancel", auth, (req, res) => {
    const b = getBooking(req.params.id, req.user.id);
    if (!b) return fail(res, 404, "Pemesanan tidak ditemukan");
    if (b.status !== PENDING) return fail(res, 400, "Hanya pemesanan yang belum dibayar yang bisa dibatalkan");
    db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(CANCELED, b.id);
    res.json(shape(getBooking(b.id, req.user.id), req.user.email));
  });

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err.type === "entity.parse.failed") return fail(res, 400, "JSON tidak valid");
    console.error(err);
    fail(res, 500, "Kesalahan server");
  });
  return app;
}

module.exports = { createApp };
