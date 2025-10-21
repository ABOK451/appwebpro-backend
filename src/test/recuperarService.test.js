// src/test/recuperarService.test.js
const RecuperarService = require("../application/recuperarService");
const pool = require("../infrastructure/db");

jest.mock("../infrastructure/db", () => ({
  query: jest.fn()
}));

describe("RecuperarService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("guardarCodigoReset devuelve true cuando rowCount > 0", async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });
    const ok = await RecuperarService.guardarCodigoReset(1, "ABC123", new Date());
    expect(ok).toBe(true);
  });

  test("guardarCodigoReset devuelve false cuando no actualiza", async () => {
    pool.query.mockResolvedValue({ rowCount: 0 });
    const ok = await RecuperarService.guardarCodigoReset(1, "ABC123", new Date());
    expect(ok).toBe(false);
  });

  test("validarCodigoReset retorna true si el código es válido", async () => {
    const future = new Date(Date.now() + 60000).toISOString();
    pool.query.mockResolvedValue({ rows: [{ reset_code: "XYZ", reset_expires: future }] });
    const valid = await RecuperarService.validarCodigoReset(1, "XYZ");
    expect(valid).toBe(true);
  });

  test("validarCodigoReset retorna false si expiró o no coincide", async () => {
    const past = new Date(Date.now() - 60000).toISOString();
    pool.query.mockResolvedValue({ rows: [{ reset_code: "ABC", reset_expires: past }] });
    const valid = await RecuperarService.validarCodigoReset(1, "XYZ");
    expect(valid).toBe(false);
  });

  test("limpiarCodigoReset retorna true si se limpió correctamente", async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });
    const ok = await RecuperarService.limpiarCodigoReset(1);
    expect(ok).toBe(true);
  });

  test("maneja errores y lanza excepción", async () => {
    pool.query.mockRejectedValue(new Error("Falla DB"));
    await expect(RecuperarService.limpiarCodigoReset(1)).rejects.toThrow("Falla DB");
  });
  test("guardarCodigoReset lanza error si falla la DB", async () => {
  pool.query.mockRejectedValue(new Error("Falla DB"));
  await expect(RecuperarService.guardarCodigoReset(1, "ABC123", new Date())).rejects.toThrow("Falla DB");
});

test("validarCodigoReset lanza error si falla la DB", async () => {
  pool.query.mockRejectedValue(new Error("Falla DB"));
  await expect(RecuperarService.validarCodigoReset(1, "XYZ")).rejects.toThrow("Falla DB");
});

});
