const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name = "") {
  const v = name.trim();
  if (!v) return "Nama wajib diisi";
  if (v.length < 3) return "Nama minimal 3 karakter";
  return "";
}

export function validateEmail(email = "") {
  const v = email.trim();
  if (!v) return "Email wajib diisi";
  if (!EMAIL_RE.test(v)) return "Format email tidak valid";
  return "";
}

export function validatePassword(password = "") {
  if (!password) return "Password wajib diisi";
  if (password.length < 8) return "Password minimal 8 karakter";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return "Password harus mengandung huruf dan angka";
  return "";
}

export function validateConfirmPassword(password = "", confirm = "") {
  if (!confirm) return "Konfirmasi password wajib diisi";
  if (password !== confirm) return "Konfirmasi password tidak cocok";
  return "";
}

// Mengembalikan objek error; objek kosong berarti valid.
export function validateLogin({ email, password }) {
  const errors = {};
  const e = validateEmail(email);
  if (e) errors.email = e;
  if (!password) errors.password = "Password wajib diisi";
  return errors;
}

export function validateRegister({ name, email, password, confirmPassword }) {
  const checks = {
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword),
  };
  const errors = {};
  for (const [k, v] of Object.entries(checks)) if (v) errors[k] = v;
  return errors;
}
