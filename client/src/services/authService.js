import axios from "axios";

// Endpoint masih placeholder: sesuaikan dengan backend (feat/server-auth-jwt).
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TOKEN_KEY = "netralid_token";

export const saveToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function toError(err) {
  const msg = err?.response?.data?.message || err?.message || "Terjadi kesalahan";
  return new Error(msg);
}

export async function login({ email, password }) {
  if (USE_MOCK) {
    await wait(400);
    if (email === "demo@netralid.test" && password === "demo1234") {
      return { token: "mock-token", user: { name: "Demo", email } };
    }
    throw new Error("Email atau password salah");
  }
  try {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  } catch (err) {
    throw toError(err);
  }
}

export async function register({ name, email, password }) {
  if (USE_MOCK) {
    await wait(400);
    return { message: "Registrasi berhasil (mock)", user: { name, email } };
  }
  try {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data;
  } catch (err) {
    throw toError(err);
  }
}
