const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Ajusta la ruta al controlador según tu proyecto
const usuarioController= require('../interfaces/controllers/usuarioController')

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

  // ---------------- listar ----------------
  it('listarUsuarios debe retornar arreglo', async () => {
    UsuarioService.listar.mockResolvedValue([
      { correo: 'a@a.com', nombre: 'Ana' }
    ]);

    const res = await request(app).get('/usuarios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  // ---------------- eliminar ----------------
  it('debe fallar si correo es inválido', async () => {
    const res = await request(app).delete('/usuario').send({ correo: 'invalido' });
    expect(res.body.codigo).toBe(2);
  });

  it('debe aceptar eliminación con correo válido', async () => {
    UsuarioService.eliminar.mockResolvedValue({ correo: 'prueba@correo.com' });

    const res = await request(app).delete('/usuario').send({ correo: 'prueba@correo.com' });
    expect(res.body.codigo).toBe(0);
    expect(res.body.mensaje).toContain('eliminado');
  });

  // ---------------- actualizar ----------------
  it('debe fallar actualización si correo vacío', async () => {
    const res = await request(app).put('/usuario').send({ nombre: 'Nuevo' });
    expect(res.body.codigo).toBe(2);
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

});
