# Hotel Nusantara: Backend API
Express + SQLite (better-sqlite3) + JWT. Frontend contoh ada di `public/`.

## Menjalankan
    npm install
    npm start        # http://localhost:3000  (akun demo: demo@hotel.id / demo123)
    npm test         # uji API (database in-memory)

Variabel lingkungan (opsional): PORT, JWT_SECRET, DB_FILE (lihat .env.example).

## Endpoint
| Metode | Path | Keterangan |
|---|---|---|
| POST | /api/register | Daftar, mengembalikan token |
| POST | /api/login | Masuk, mengembalikan token (berlaku 2 jam) |
| GET | /api/me | Profil pengguna (butuh token) |
| GET | /api/rooms?in=&out=&guests= | Daftar kamar + ketersediaan |
| GET | /api/bookings | Pemesanan milik pengguna |
| GET | /api/bookings/:id | Detail pemesanan |
| POST | /api/bookings | Buat pemesanan: {room, in, out, guests} |
| POST | /api/bookings/:id/pay | Bayar (simulasi): {method} |
| POST | /api/bookings/:id/cancel | Batalkan (hanya yang belum dibayar) |

Header: `Authorization: Bearer <token>`. Error: `{ "error": "pesan" }`.

## Skema database
users(id, name, email UNIQUE, password_hash) / rooms(id, name, price, capacity, stock) /
bookings(id, user_id, room_id, check_in, check_out, nights, guests, total, status, method)

## Catatan
Pembayaran masih simulasi. Belum ada rate limiting, role admin, dan refresh token.
