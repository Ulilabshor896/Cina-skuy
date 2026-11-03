import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormInput from "../components/FormInput.jsx";
import { validateRegister } from "../utils/validation.js";
import { register } from "../services/authService.js";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setApiError("");
    const v = validateRegister(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate("/login");
    } catch (err) {
      setApiError(err.message || "Gagal mendaftar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} noValidate className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="mb-1 text-2xl font-bold">Daftar Akun</h1>
        <p className="mb-5 text-sm text-slate-600">Buat akun NetralID baru.</p>
        <FormInput id="name" label="Nama" value={form.name} onChange={onChange} error={errors.name} />
        <FormInput id="email" label="Email" type="email" value={form.email} onChange={onChange} error={errors.email} />
        <FormInput id="password" label="Password" type="password" value={form.password} onChange={onChange} error={errors.password} />
        <FormInput id="confirmPassword" label="Konfirmasi password" type="password" value={form.confirmPassword} onChange={onChange} error={errors.confirmPassword} />
        {apiError && <p role="alert" className="mb-3 text-sm text-red-600">{apiError}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white disabled:opacity-60">
          {loading ? "Memproses..." : "Daftar"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Sudah punya akun? <Link to="/login" className="font-semibold text-teal-700">Masuk</Link>
        </p>
      </form>
    </main>
  );
}
