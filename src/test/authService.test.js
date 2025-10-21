// src/test/authService.test.js
const AuthService = require("../application/authService");
const pool = require("../infrastructure/db");

jest.mock("../infrastructure/db", () => ({
  query: jest.fn()
}));

describe("AuthService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("retorna null si lat o lng no están definidos", async () => {
    const result = await AuthService.guardarUbicacion(1, null, null);
    expect(result).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("retorna null si no se actualiza ninguna fila", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const result = await AuthService.guardarUbicacion(1, 19.4, -99.1);
    expect(result).toBeNull();
  });

  test("retorna el usuario actualizado correctamente", async () => {
    const row = { usuario_id: 1, latitud: 19.4, longitud: -99.1, ultimo_login: new Date() };
    pool.query.mockResolvedValue({ rows: [row] });
    const result = await AuthService.guardarUbicacion(1, 19.4, -99.1);
    expect(result).toEqual(row);
  });

  test("lanza error si ocurre una excepción en la base de datos", async () => {
    pool.query.mockRejectedValue(new Error("DB Error"));
    await expect(AuthService.guardarUbicacion(1, 1, 1))
      .rejects.toThrow("No se pudo guardar la ubicación del usuario");
  });
});
