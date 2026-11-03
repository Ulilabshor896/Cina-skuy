import { describe, it, expect } from "vitest";
import {
  validateName, validateEmail, validatePassword,
  validateConfirmPassword, validateLogin, validateRegister,
} from "./validation";

describe("validateName", () => {
  it("menolak kosong/spasi", () => {
    expect(validateName("")).not.toBe("");
    expect(validateName("   ")).not.toBe("");
  });
  it("menolak < 3 karakter", () => expect(validateName("Al")).toBe("Nama minimal 3 karakter"));
  it("menerima nama valid", () => expect(validateName("Rayinda")).toBe(""));
});

describe("validateEmail", () => {
  it("menolak kosong", () => expect(validateEmail("")).toBe("Email wajib diisi"));
  it.each(["abc", "abc@", "abc@domain", "a b@x.com"])("menolak format: %s", (v) =>
    expect(validateEmail(v)).toBe("Format email tidak valid"));
  it("menerima email valid", () => expect(validateEmail("user@mail.com")).toBe(""));
});

describe("validatePassword", () => {
  it("menolak kosong", () => expect(validatePassword("")).toBe("Password wajib diisi"));
  it("menolak pendek", () => expect(validatePassword("abc123")).toBe("Password minimal 8 karakter"));
  it("menolak tanpa angka/huruf", () => {
    expect(validatePassword("abcdefgh")).toMatch(/huruf dan angka/);
    expect(validatePassword("12345678")).toMatch(/huruf dan angka/);
  });
  it("menerima password kuat", () => expect(validatePassword("abcd1234")).toBe(""));
});

describe("validateConfirmPassword", () => {
  it("menolak kosong", () => expect(validateConfirmPassword("abcd1234", "")).not.toBe(""));
  it("menolak tidak cocok", () =>
    expect(validateConfirmPassword("abcd1234", "abcd12345")).toBe("Konfirmasi password tidak cocok"));
  it("menerima cocok", () => expect(validateConfirmPassword("abcd1234", "abcd1234")).toBe(""));
});

describe("validateLogin", () => {
  it("valid", () => expect(validateLogin({ email: "a@b.com", password: "x" })).toEqual({}));
  it("error untuk field kosong", () => {
    const r = validateLogin({ email: "", password: "" });
    expect(r).toHaveProperty("email");
    expect(r).toHaveProperty("password");
  });
});

describe("validateRegister", () => {
  const ok = { name: "Rayinda", email: "ray@mail.com", password: "abcd1234", confirmPassword: "abcd1234" };
  it("valid jika semua benar", () => expect(validateRegister(ok)).toEqual({}));
  it("mengumpulkan semua error", () => {
    const r = validateRegister({ name: "", email: "salah", password: "123", confirmPassword: "456" });
    expect(Object.keys(r).sort()).toEqual(["confirmPassword", "email", "name", "password"]);
  });
  it("mendeteksi konfirmasi berbeda", () => {
    const r = validateRegister({ ...ok, confirmPassword: "beda1234" });
    expect(r.confirmPassword).toBeDefined();
    expect(r.password).toBeUndefined();
  });
});
