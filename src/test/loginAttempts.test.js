// src/test/loginAttempts.test.js
const { loginAttempt, isBlocked } = require("../interfaces/middlewares/loginAttempts");
const pool = require("../infrastructure/db");
const transporter = require("../config/email");

// 🔹 Mockeamos dependencias
jest.mock("../infrastructure/db", () => ({
  query: jest.fn()
}));

jest.mock("../config/email", () => ({
  sendMail: jest.fn()
}));

describe("Middleware loginAttempts", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isBlocked()", () => {
    test("retorna false si no hay datos del usuario", async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await isBlocked(1);
      expect(result).toBe(false);
    });

    test("retorna true si el usuario aún está bloqueado", async () => {
      const futureDate = new Date(Date.now() + 60000).toISOString();
      pool.query.mockResolvedValue({ rows: [{ failed_attempts: 5, blocked_until: futureDate }] });
      const result = await isBlocked(1);
      expect(result).toBe(true);
    });

    test("resetea intentos si el bloqueo expiró", async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      pool.query.mockResolvedValueOnce({ rows: [{ failed_attempts: 5, blocked_until: pastDate }] })
                .mockResolvedValueOnce({}); // para el UPDATE
      const result = await isBlocked(1);
      expect(result).toBe(false);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe("loginAttempt()", () => {
    const mockUser = { id: 1, correo: "test@correo.com" };

    test("incrementa intentos fallidos y actualiza en BD", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ failed_attempts: 2 }] }); // select
      pool.query.mockResolvedValueOnce({}); // update
      await loginAttempt(mockUser);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE usuario_login SET failed_attempts"),
        [3, 1]
      );
    });

    test("bloquea al usuario y envía correo si supera el máximo", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ failed_attempts: 5 }] }); // select
      pool.query.mockResolvedValueOnce({}); // update bloqueado
      await loginAttempt(mockUser);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE usuario_login"),
        expect.arrayContaining([expect.any(Number), expect.any(Date), 1])
      );
      expect(transporter.sendMail).toHaveBeenCalled();
    });

    test("maneja cuando no hay registros previos (nuevo usuario)", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({});
      await loginAttempt(mockUser);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });
});
