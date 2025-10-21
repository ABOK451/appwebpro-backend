const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Ajusta la ruta al controlador según tu proyecto
const usuarioController = require('../interfaces/controllers/usuarioController');

// Ajusta la ruta al servicio según tu proyecto
const UsuarioService = require('../application/usuarioService');
jest.mock('../application/usuarioService'); // Mock para aislar tests

const app = express();
app.use(bodyParser.json());
app.post('/usuario', usuarioController.crearUsuario);
app.get('/usuarios', usuarioController.listarUsuarios);
app.delete('/usuario', usuarioController.eliminarUsuario);
app.put('/usuario', usuarioController.actualizarUsuario);

describe('UsuarioController', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------- crear ----------------
  it('debe rechazar creación de usuario con datos vacíos', async () => {
    const res = await request(app).post('/usuario').send({});
    expect(res.body.codigo).toBe(2);
    expect(res.body.mensaje).toBe('Errores de validación');
  });

  it('debe aceptar creación de usuario válido', async () => {
    UsuarioService.crear.mockResolvedValue({
      correo: 'prueba@correo.com',
      nombre: 'Juan'
    });

    const res = await request(app).post('/usuario').send({
      correo: 'prueba@correo.com',
      password: 'Aa123456!',
      rol: 'user',
      estado: 'activo',
      nombre: 'Juan',
      app: 'Perez',
      apm: 'Lopez',
      telefono: '+521234567890'
    });
    expect(res.body.codigo).toBe(0);
    expect(res.body.usuario.correo).toBe('prueba@correo.com');
  });

  it('rechaza correo inválido', async () => {
    const res = await request(app).post('/usuario').send({
      correo: 'correo-invalido',
      password: 'Aa123456!',
      rol: 'user',
      estado: 'activo',
      nombre: 'Juan',
      app: 'Perez',
      apm: 'Lopez',
      telefono: '+521234567890'
    });
    expect(res.body.codigo).toBe(2);
    expect(res.body.errores).toContain('El correo no es válido');
  });

  it('rechaza teléfono inválido', async () => {
    const res = await request(app).post('/usuario').send({
      correo: 'test@correo.com',
      password: 'Aa123456!',
      rol: 'user',
      estado: 'activo',
      nombre: 'Juan',
      app: 'Perez',
      apm: 'Lopez',
      telefono: '1234'
    });
    expect(res.body.codigo).toBe(2);
    expect(res.body.errores).toContain('El teléfono debe incluir código de país y exactamente 10 dígitos, ej: +521234567890');
  });

  it('rechaza contraseña inválida', async () => {
    const res = await request(app).post('/usuario').send({
      correo: 'test@correo.com',
      password: '123',
      rol: 'user',
      estado: 'activo',
      nombre: 'Juan',
      app: 'Perez',
      apm: 'Lopez',
      telefono: '+521234567890'
    });
    expect(res.body.codigo).toBe(2);
    expect(res.body.errores).toContain('La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial');
  });

  it('rechaza nombre/apellidos inválidos', async () => {
    const res = await request(app).post('/usuario').send({
      correo: 'test@correo.com',
      password: 'Aa123456!',
      rol: 'user',
      estado: 'activo',
      nombre: 'Juan123',
      app: 'Perez1',
      apm: 'Lopez2',
      telefono: '+521234567890'
    });
    expect(res.body.codigo).toBe(2);
    expect(res.body.errores).toContain('El nombre solo puede contener letras y espacios');
    expect(res.body.errores).toContain('El apellido paterno solo puede contener letras y espacios');
    expect(res.body.errores).toContain('El apellido materno solo puede contener letras y espacios');
  });

  it('cubre error de duplicación de correo', async () => {
    UsuarioService.crear.mockRejectedValue({ code: '23505', detail: 'Key (correo)=(test@correo.com) already exists' });
    const res = await request(app).post('/usuario').send({
      correo: 'test@correo.com',
      password: 'Aa123456!',
      rol: 'user',
      estado: 'activo',
      nombre: 'Juan',
      app: 'Perez',
      apm: 'Lopez',
      telefono: '+521234567890'
    });
    expect(res.body.codigo).toBe(2);
    expect(res.body.mensaje).toBe('El correo ya existe, no se puede repetir');
  });

  it('cubre catch de crearUsuario', async () => {
    UsuarioService.crear.mockRejectedValue(new Error('DB fallida'));
    const res = await request(app).post('/usuario').send({
      correo: 'test2@correo.com',
      password: 'Aa123456!',
      rol: 'user',
      estado: 'activo',
      nombre: 'Juan',
      app: 'Perez',
      apm: 'Lopez',
      telefono: '+521234567890'
    });
    expect(res.body.codigo).toBe(5);
    expect(res.body.detalle).toBe('DB fallida');
  });

  // ---------------- listar ----------------
  it('listarUsuarios debe retornar arreglo', async () => {
    UsuarioService.listar.mockResolvedValue([
      { correo: 'a@a.com', nombre: 'Ana' }
    ]);

    const res = await request(app).get('/usuarios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it('listarUsuarios captura error', async () => {
    UsuarioService.listar.mockRejectedValue(new Error('DB fallida'));
    const res = await request(app).get('/usuarios');
    expect(res.body.codigo).toBe(5);
    expect(res.body.detalle).toBe('DB fallida');
  });

  // ---------------- eliminar ----------------
  it('debe fallar si correo es inválido', async () => {
    const res = await request(app).delete('/usuario').send({ correo: 'invalido' });
    expect(res.body.codigo).toBe(2);
  });

  it('eliminar rechaza correo vacío', async () => {
    const res = await request(app).delete('/usuario').send({ correo: '' });
    expect(res.body.codigo).toBe(2);
    expect(res.body.errores).toContain('El correo es requerido para eliminar un usuario');
  });

  it('debe aceptar eliminación con correo válido', async () => {
    UsuarioService.eliminar.mockResolvedValue({ correo: 'prueba@correo.com', nombre: 'Juan' });

    const res = await request(app).delete('/usuario').send({ correo: 'prueba@correo.com' });
    expect(res.body.codigo).toBe(0);
    expect(res.body.mensaje).toContain('eliminado');
  });

  it('eliminar usuario no encontrado', async () => {
    UsuarioService.eliminar.mockResolvedValue(null);
    const res = await request(app).delete('/usuario').send({ correo: 'no@existe.com' });
    expect(res.body.codigo).toBe(3);
    expect(res.body.mensaje).toContain('no encontrado');
  });

  it('captura error en eliminar usuario', async () => {
    UsuarioService.eliminar.mockRejectedValue(new Error('DB fallida'));
    const res = await request(app).delete('/usuario').send({ correo: 'test@correo.com' });
    expect(res.body.codigo).toBe(5);
    expect(res.body.detalle).toBe('DB fallida');
  });

  // ---------------- actualizar ----------------
  it('debe fallar actualización si correo vacío', async () => {
    const res = await request(app).put('/usuario').send({ nombre: 'Nuevo' });
    expect(res.body.codigo).toBe(2);
  });

  it('actualizar rechaza correo inválido', async () => {
    const res = await request(app).put('/usuario').send({
      correo: 'correo-invalido',
      nombre: 'Nuevo'
    });
    expect(res.body.codigo).toBe(2);
    expect(res.body.errores).toContain('El correo no es válido');
  });

  it('actualizar rechaza teléfono inválido', async () => {
    const res = await request(app).put('/usuario').send({
      correo: 'test@correo.com',
      telefono: '123'
    });
    expect(res.body.codigo).toBe(2);
    expect(res.body.errores).toContain('El teléfono debe incluir código de país y exactamente 10 dígitos, ej: +521234567890');
  });

  it('actualizar rechaza contraseña inválida', async () => {
    const res = await request(app).put('/usuario').send({
      correo: 'test@correo.com',
      password: '123'
    });
    expect(res.body.codigo).toBe(2);
    expect(res.body.errores).toContain('La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial');
  });

  it('debe actualizar usuario válido', async () => {
    UsuarioService.actualizar.mockResolvedValue({ correo: 'prueba@correo.com', nombre: 'NuevoNombre' });

    const res = await request(app).put('/usuario').send({
      correo: 'prueba@correo.com',
      nombre: 'NuevoNombre'
    });
    expect(res.body.codigo).toBe(0);
    expect(res.body.usuario.nombre).toBe('NuevoNombre');
  });

  it('captura error en actualizar usuario', async () => {
    UsuarioService.actualizar.mockRejectedValue(new Error('DB fallida'));
    const res = await request(app).put('/usuario').send({
      correo: 'test@correo.com',
      nombre: 'NuevoNombre'
    });
    expect(res.body.codigo).toBe(5);
    expect(res.body.detalle).toBe('DB fallida');
  });

});
