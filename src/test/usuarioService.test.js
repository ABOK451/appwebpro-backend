// src/test/usuarioService.test.js
const UsuarioService = require("../application/usuarioService");
const pool = require("../infrastructure/db");
const bcrypt = require("bcrypt");

jest.mock("../infrastructure/db", () => ({ query: jest.fn() }));
jest.mock("bcrypt", () => ({ hash: jest.fn().mockResolvedValue("hashedpass") }));

describe("UsuarioService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("listar retorna lista de usuarios", async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, correo: "a@a.com", rol: "user", estado: "activo", nombre: "A", app: "", apm: "", telefono: "" }] });
    const res = await UsuarioService.listar();
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(1);
    expect(res[0].correo).toBe("a@a.com");
  });

  test("crear inserta usuario y login correctamente", async () => {
    // bcrypt.hash ya mockeado para resolver "hashedpass"
    // primer query: INSERT usuarios -> retorna filas con id
    // segundo query: INSERT usuario_login -> retorna {}
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, correo: "a@a.com", rol: "user", estado: "activo", nombre: "A", app: "", apm: "", telefono: "" }] })
      .mockResolvedValueOnce({});
    const u = await UsuarioService.crear({ correo: "a@a.com", password: "123456A!", rol: "user" });
    expect(bcrypt.hash).toHaveBeenCalledWith("123456A!", 10);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(u).toBeDefined();
    expect(u.correo).toBe("a@a.com");
  });

  test("crear lanza error por correo duplicado (23505)", async () => {
    // bcrypt.hash resuelve, pero pool.query (insert) falla con código 23505
    const dbErr = new Error("duplicate");
    dbErr.code = "23505";
    dbErr.detail = "Key (correo)= (a@a.com) ya existe";
    bcrypt.hash.mockResolvedValueOnce("hashedpass");
    pool.query.mockRejectedValueOnce(dbErr);

    await expect(UsuarioService.crear({ correo: "a@a.com", password: "123456A!", rol: "user" }))
      .rejects.toThrow(/El correo ya existe|correo/i);
  });

  test("buscarPorCorreo retorna null si no encuentra usuario", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const res = await UsuarioService.buscarPorCorreo("none");
    expect(res).toBeNull();
  });

  test("buscarPorCorreo retorna usuario válido", async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, correo: "x@x.com", failed_attempts: 2, blocked_until: null, password: "h" }] });
    const res = await UsuarioService.buscarPorCorreo("x@x.com");
    expect(res).toBeTruthy();
    expect(res.failed_attempts).toBe(2);
    expect(res.correo).toBe("x@x.com");
  });

  test("guardarToken actualiza token si no hay sesión activa (rama UPDATE)", async () => {
    // Primera llamada SELECT devuelve [], forzamos la UPDATE posterior que devuelve row con token
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // select
      .mockResolvedValueOnce({ rows: [{ usuario_id: 1, token: "abc" }] }); // update returning
    const res = await UsuarioService.guardarToken(1, "abc");
    expect(res).toBeTruthy();
    expect(res.token).toBe("abc");
  });

  test("obtenerTokenActivo retorna null si token expiró", async () => {
    const expired = new Date(Date.now() - 10000).toISOString();
    pool.query.mockResolvedValue({ rows: [{ token: "abc", token_expires: expired }] });
    const res = await UsuarioService.obtenerTokenActivo("a@a.com");
    expect(res).toBeNull();
  });

  test("actualizarLogin actualiza y retorna fila", async () => {
    pool.query.mockResolvedValue({ rows: [{ usuario_id: 1, failed_attempts: 0 }] });
    const res = await UsuarioService.actualizarLogin(1, { failed_attempts: 0 });
    expect(pool.query).toHaveBeenCalled();
    expect(res).toBeTruthy();
    expect(res.failed_attempts === 0 || res.failed_attempts === "0").toBeTruthy();
  });

  test("actualizar devuelve null si no encuentra correo a actualizar", async () => {
    // actualizar usa promHash y luego un UPDATE RETURNING *
    // simulamos que retorna filas vacías
    pool.query.mockResolvedValue({ rows: [] });
    const res = await UsuarioService.actualizar("noexiste@mail.com", { nombre: "nuevo" });
    expect(res).toBeNull();
  });

  test("eliminar devuelve usuario eliminado o null", async () => {
    // la función eliminar espera { correo } y retorna Usuario o null
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5, correo: "z@z.com" }] });
    const removed = await UsuarioService.eliminar({ correo: "z@z.com" });
    expect(removed).toBeTruthy();
    expect(removed.correo).toBe("z@z.com");

    pool.query.mockResolvedValueOnce({ rows: [] });
    const removed2 = await UsuarioService.eliminar({ correo: "no@no.com" });
    expect(removed2).toBeNull();
  });

  test("maneja errores inesperados en crear (repropaga)", async () => {
    pool.query.mockRejectedValue(new Error("Insert Error"));
    await expect(
      UsuarioService.crear({ correo: "fail@test.com", password: "123456A!", rol: "admin" })
    ).rejects.toThrow("Insert Error");
  });

  test("maneja errores inesperados en listar (repropaga)", async () => {
    pool.query.mockRejectedValue(new Error("Query error"));
    await expect(UsuarioService.listar()).rejects.toThrow("Query error");
  });

  test("maneja errores inesperados en buscarPorCorreo (repropaga)", async () => {
    pool.query.mockRejectedValue(new Error("DB fail"));
    await expect(UsuarioService.buscarPorCorreo("x@x.com")).rejects.toThrow("DB fail");
  });

  test("guardarToken lanza error si ocurre problema con la base", async () => {
    pool.query.mockRejectedValue(new Error("Update fail"));
    await expect(UsuarioService.guardarToken(1, "tokenx")).rejects.toThrow("Update fail");
  });

  test("obtenerTokenActivo lanza error si falla la consulta", async () => {
    pool.query.mockRejectedValue(new Error("Select fail"));
    await expect(UsuarioService.obtenerTokenActivo("correo")).rejects.toThrow("Select fail");
  });

  test("actualizarPassword ejecuta query correctamente", async () => {
  pool.query.mockResolvedValue({ rows: [] });
  await UsuarioService.actualizarPassword(5, "hashedpass");
  expect(pool.query).toHaveBeenCalledWith(
    "UPDATE usuarios SET password=$1 WHERE id=$2",
    ["hashedpass", 5]
  );
});

test("buscarPorToken retorna usuario válido", async () => {
  const now = new Date();
  pool.query.mockResolvedValue({
    rows: [{
      id: 1, correo: "a@a.com", rol: "user", estado: "activo",
      nombre: "A", app: "", apm: "", telefono: "",
      sesion_activa: true, token: "abc",
      token_expires: now.toISOString(),
      inicio_sesion: now.toISOString(),
      fin_sesion: now.toISOString()
    }]
  });
  const res = await UsuarioService.buscarPorToken("abc");
  expect(res).toBeTruthy();
  expect(res.token).toBe("abc");
  expect(res.sesion_activa).toBe(true);
});

test("buscarPorToken lanza error si falla consulta", async () => {
  pool.query.mockRejectedValue(new Error("DB fail"));
  await expect(UsuarioService.buscarPorToken("tkn")).rejects.toThrow("DB fail");
});

test("obtenerLogin retorna login con fechas convertidas", async () => {
  const now = new Date();
  pool.query.mockResolvedValue({
    rows: [{
      usuario_id: 1, inicio_sesion: now.toISOString(), fin_sesion: now.toISOString()
    }]
  });
  const res = await UsuarioService.obtenerLogin(1);
  expect(res.inicio_sesion instanceof Date).toBe(true);
  expect(res.fin_sesion instanceof Date).toBe(true);
});

test("obtenerLogin retorna null si no hay registros", async () => {
  pool.query.mockResolvedValue({ rows: [] });
  const res = await UsuarioService.obtenerLogin(9);
  expect(res).toBeNull();
});

test("obtenerLogin lanza error si falla consulta", async () => {
  pool.query.mockRejectedValue(new Error("Query fail"));
  await expect(UsuarioService.obtenerLogin(9)).rejects.toThrow("Query fail");
});

test("actualizarPassword actualiza la contraseña correctamente", async () => {
  pool.query.mockResolvedValue({ rowCount: 1 });
  await UsuarioService.actualizarPassword(7, "nuevaPass");
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringMatching(/UPDATE usuarios SET password/i),
    ["nuevaPass", 7]
  );
});






});
