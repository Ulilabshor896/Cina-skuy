const test = require("node:test");
const assert = require("node:assert/strict");
const { openDb } = require("../src/db");
const { createApp } = require("../src/app");

let server, base, demo;
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
async function call(path, method = "GET", body, token) {
  const r = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { s: r.status, j: await r.json() };
}
const book = (room, token, extra = {}) =>
  call("/bookings", "POST", { room, in: day(10), out: day(11), guests: 1, ...extra }, token);

test.before(async () => {
  await new Promise((r) => { server = createApp(openDb(":memory:"), "test").listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
  demo = (await call("/login", "POST", { email: "demo@hotel.id", password: "demo123" })).j.token;
});
test.after(() => server.close());

test("login: sandi salah ditolak, sandi benar mendapat token", async () => {
  assert.equal((await call("/login", "POST", { email: "demo@hotel.id", password: "x" })).s, 401);
  assert.ok(demo);
});

test("register: validasi, sukses, dan email ganda", async () => {
  assert.equal((await call("/register", "POST", { name: "A", email: "x", password: "1" })).s, 400);
  const ok = await call("/register", "POST", { name: "Budi", email: "budi@mail.com", password: "rahasia1" });
  assert.equal(ok.s, 201);
  assert.equal((await call("/register", "POST", { name: "Budi", email: "BUDI@mail.com", password: "rahasia1" })).s, 409);
});

test("endpoint pemesanan wajib login", async () => {
  assert.equal((await call("/bookings")).s, 401);
});

test("total dihitung server: 1 malam Standard + pajak 10%", async () => {
  const r = await book(1, demo);
  assert.equal(r.s, 201);
  assert.equal(r.j.total, 385000);
  assert.equal(r.j.st, "Menunggu Pembayaran");
});

test("validasi pemesanan: tanggal, masa lalu, kapasitas, kamar", async () => {
  assert.equal((await book(1, demo, { out: day(10) })).s, 400);
  assert.equal((await book(1, demo, { in: day(-3), out: day(-2) })).s, 400);
  assert.equal((await book(1, demo, { in: "bukan-tanggal" })).s, 400);
  assert.equal((await book(1, demo, { guests: 5 })).s, 400);
  assert.equal((await book(99, demo)).s, 400);
});

test("ketersediaan: stok Suite habis lalu dibatalkan membebaskan slot", async () => {
  const a = await book(4, demo, { in: day(30), out: day(32) });
  const b = await book(4, demo, { in: day(31), out: day(33) });
  assert.equal(a.s, 201);
  assert.equal(b.s, 201);
  assert.equal((await book(4, demo, { in: day(31), out: day(32) })).s, 409);
  assert.equal((await call(`/bookings/${a.j.id}/cancel`, "POST", null, demo)).j.st, "Dibatalkan");
  assert.equal((await book(4, demo, { in: day(31), out: day(32) })).s, 201);
});

test("pembayaran: metode valid, lunas, tidak bisa bayar/batal lagi", async () => {
  const b = (await book(2, demo)).j;
  assert.equal((await call(`/bookings/${b.id}/pay`, "POST", { method: "Bitcoin" }, demo)).s, 400);
  const paid = await call(`/bookings/${b.id}/pay`, "POST", { method: "QRIS" }, demo);
  assert.equal(paid.j.st, "Lunas");
  assert.equal((await call(`/bookings/${b.id}/pay`, "POST", { method: "QRIS" }, demo)).s, 400);
  assert.equal((await call(`/bookings/${b.id}/cancel`, "POST", null, demo)).s, 400);
});

test("pengguna lain tidak bisa mengakses pemesanan orang lain", async () => {
  const b = (await book(1, demo)).j;
  const other = (await call("/register", "POST", { name: "Citra", email: "citra@mail.com", password: "rahasia1" })).j.token;
  assert.equal((await call(`/bookings/${b.id}`, "GET", null, other)).s, 404);
  assert.equal((await call(`/bookings/${b.id}/pay`, "POST", { method: "QRIS" }, other)).s, 404);
  assert.equal((await call("/bookings", "GET", null, other)).j.length, 0);
});

test("daftar kamar menampilkan ketersediaan per tanggal", async () => {
  const r = await call(`/rooms?in=${day(60)}&out=${day(61)}`);
  assert.equal(r.j.length, 4);
  assert.equal(r.j.find((x) => x.name === "Suite").available, 2);
});
