import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import { getToken, clearToken } from "./services/authService.js";

function Home() {
  const navigate = useNavigate();
  if (!getToken()) return <Navigate to="/login" replace />;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Berhasil masuk</h1>
        <p className="mt-1 text-slate-600">Halaman beranda (placeholder).</p>
        <button
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white"
          onClick={() => { clearToken(); navigate("/login"); }}
        >
          Keluar
        </button>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
