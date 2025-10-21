const bcrypt = require('bcrypt');
const UsuarioService = require('../application/usuarioService');

jest.mock('../infrastructure/db', () => ({
  query: jest.fn()
}));
const pool = require('../infrastructure/db');

// Evitar logs de consola en tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

beforeEach(() => {
  pool.query.mockReset();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('UsuarioService', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------- listar ----------------
  describe('listar', () => {
    it('debe retornar un arreglo de usuarios', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, correo: 'a@a.com', rol: 'admin', estado: 'activo', nombre: 'Ana', app: 'Perez', apm: 'Lopez', telefono: '+521234567890' }
        ]
      });
      const usuarios = await UsuarioService.listar();
      expect(usuarios.length).toBe(1);
      expect(usuarios[0].correo).toBe('a@a.com');
    });

    it('debe manejar error de DB', async () => {
      pool.query.mockRejectedValue(new Error('DB fallida'));
      await expect(UsuarioService.listar()).rejects.toThrow('DB fallida');
    });
  });

  // ---------------- crear ----------------
  describe('crear', () => {
    it('debe crear un usuario correctamente', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, correo: 'a@a.com', rol: 'admin', estado: 'activo', nombre: 'Ana', app: 'Perez', apm: 'Lopez', telefono: '+521234567890' }]
        })
        .mockResolvedValueOnce({}); // insert usuario_login

      const userData = {
        correo: 'a@a.com',
        password: 'Aa123456!',
        rol: 'admin',
        estado: 'activo',
        nombre: 'Ana',
        app: 'Perez',
        apm: 'Lopez',
        telefono: '+521234567890'
      };
      const usuario = await UsuarioService.crear(userData);
      expect(usuario.correo).toBe(userData.correo);
    });

    it('debe fallar si el correo ya existe', async () => {
      const error = { code: '23505', detail: 'Key (correo)=(a@a.com) ya existe' };
      pool.query.mockRejectedValue(error);
      await expect(UsuarioService.crear({
        correo: 'a@a.com',
        password: 'Aa123456!',
        rol: 'admin',
        estado: 'activo',
        nombre: 'Ana',
        app: 'Perez',
        apm: 'Lopez',
        telefono: '+521234567890'
      })).rejects.toThrow('El correo ya existe, no se puede repetir');
    });
  });

  // ---------------- eliminar ----------------
  describe('eliminar', () => {
    it('debe eliminar un usuario existente', async () => {
      pool.query.mockResolvedValue({ 
        rows: [{ id:1, correo:'a@a.com', rol:'admin', estado:'activo', nombre:'Ana', app:'Perez', apm:'Lopez', telefono:'+521234567890'}]
      });
      const res = await UsuarioService.eliminar({ correo: 'a@a.com' });
      expect(res.correo).toBe('a@a.com');
    });

    it('debe retornar null si usuario no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const res = await UsuarioService.eliminar({ correo: 'noexiste@a.com' });
      expect(res).toBeNull();
    });
  });

  // ---------------- actualizar ----------------
  describe('actualizar', () => {
    it('debe actualizar los datos del usuario', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id:1, correo:'a@a.com', password:'hash123', rol:'user', estado:'activo', nombre:'Juan', app:'Perez', apm:'Lopez', telefono:'+521234567890'}]
      });

      const res = await UsuarioService.actualizar('a@a.com', { nombre: 'Juan' });
      expect(res.nombre).toBe('Juan');
    });

    it('debe retornar null si usuario no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const res = await UsuarioService.actualizar('no@existe.com', { nombre: 'Juan' });
      expect(res).toBeNull();
    });

    it('debe actualizar password si se proporciona', async () => {
      const hashed = await bcrypt.hash('Aa123456!', 10);
      pool.query.mockResolvedValue({ rows: [{ id:1, correo:'a@a.com', password:hashed, rol:'user', estado:'activo', nombre:'Juan', app:'Perez', apm:'Lopez', telefono:'+521234567890'}] });
      const res = await UsuarioService.actualizar('a@a.com', { password: 'Aa123456!' });
      expect(res.password).toMatch(/^\$2[aby]\$/); // hash bcrypt
    });
  });

  // ---------------- actualizarLogin ----------------
  describe('actualizarLogin', () => {
    it('debe actualizar login del usuario', async () => {
      pool.query.mockResolvedValue({ rows: [{ usuario_id:1 }] });
      const res = await UsuarioService.actualizarLogin(1, { failed_attempts:1 });
      expect(res.usuario_id).toBe(1);
    });
  });

  // ---------------- actualizarPassword ----------------
  describe('actualizarPassword', () => {
    it('debe actualizar la contraseña', async () => {
      pool.query.mockResolvedValue(undefined); // corregido para toBeUndefined
      await expect(UsuarioService.actualizarPassword(1, 'hash123')).resolves.toBeUndefined();
    });
  });

  // ---------------- buscarPorCorreo ----------------
  describe('buscarPorCorreo', () => {
    it('retorna usuario si existe', async () => {
      pool.query.mockResolvedValue({ rows: [{ id:1, correo:'a@a.com', password:'hash', rol:'user', estado:'activo', nombre:'Juan', app:'Perez', apm:'Lopez', telefono:'+521234567890', failed_attempts:0, blocked_until:null }] });
      const res = await UsuarioService.buscarPorCorreo('a@a.com');
      expect(res.correo).toBe('a@a.com');
    });

    it('retorna null si no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const res = await UsuarioService.buscarPorCorreo('no@existe.com');
      expect(res).toBeNull();
    });
  });

  // ---------------- guardarToken ----------------
  describe('guardarToken', () => {
    it('guarda token si no hay token activo', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // select
        .mockResolvedValueOnce({ rows: [{ usuario_id:1, token:'abc', token_expires:new Date(), sesion_activa:true, inicio_sesion:new Date(), fin_sesion:new Date() }] }); // update
      const res = await UsuarioService.guardarToken(1, 'abc');
      expect(res.token).toBe('abc');
    });
  });

  // ---------------- obtenerLogin ----------------
  describe('obtenerLogin', () => {
    it('retorna login si existe', async () => {
      pool.query.mockResolvedValue({ rows: [{ usuario_id:1, inicio_sesion:new Date(), fin_sesion:new Date() }] });
      const res = await UsuarioService.obtenerLogin(1);
      expect(res.usuario_id).toBe(1);
    });

    it('retorna null si no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const res = await UsuarioService.obtenerLogin(1);
      expect(res).toBeNull();
    });
  });

  // ---------------- obtenerTokenActivo ----------------
  describe('obtenerTokenActivo', () => {
    it('retorna token si vigente', async () => {
      pool.query.mockResolvedValue({ rows: [{ token:'abc', token_expires: new Date(Date.now()+10000) }] });
      const token = await UsuarioService.obtenerTokenActivo('a@a.com');
      expect(token).toBe('abc');
    });

    it('retorna null si expirado', async () => {
      pool.query.mockResolvedValue({ rows: [{ token:'abc', token_expires: new Date(Date.now()-10000) }] });
      const token = await UsuarioService.obtenerTokenActivo('a@a.com');
      const tokenNull = await UsuarioService.obtenerTokenActivo('a@a.com');
      expect(tokenNull).toBeNull();
    });
  });

  // ---------------- buscarPorToken ----------------
  describe('buscarPorToken', () => {
    it('retorna usuario si token existe', async () => {
      pool.query.mockResolvedValue({ rows: [{ id:1, correo:'a@a.com', rol:'user', estado:'activo', nombre:'Juan', app:'Perez', apm:'Lopez', telefono:'+521234567890', sesion_activa:true, token:'abc', token_expires:new Date(), inicio_sesion:new Date(), fin_sesion:new Date() }] });
      const res = await UsuarioService.buscarPorToken('abc');
      expect(res.token).toBe('abc');
    });

    it('retorna null si token no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const res = await UsuarioService.buscarPorToken('noexiste');
      expect(res).toBeNull();
    });
  });

});
