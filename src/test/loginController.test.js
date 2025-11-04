const { loginUsuario, verificarCodigo } = require('../interfaces/controllers/authController');
const UsuarioService = require('../application/usuarioService');
const RecuperarService = require('../application/recuperarService');
const transporter = require('../config/email');
const { obtenerUbicacionIP } = require('../infrastructure/utils/geolocation');
const pool = require('../infrastructure/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// mocks generales
jest.mock('../infrastructure/db', () => {
  const mClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockResolvedValue(mClient),
  };
});

jest.mock('../config/email', () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'fake-jwt-token'),
}));

jest.mock('../application/usuarioService');
jest.mock('../application/recuperarService');
jest.mock('../application/authService');

jest.mock('../infrastructure/utils/geolocation', () => ({
  obtenerUbicacionIP: jest.fn(() => Promise.resolve({ lat: 10, lng: 20 })),
}));

jest.mock('dns', () => ({
  lookup: jest.fn((_, cb) => cb(null, '127.0.0.1'))
}));


beforeEach(() => {
  jest.clearAllMocks();

  const { query, connect } = require('../infrastructure/db');
  query.mockResolvedValue({ rows: [{ failed_attempts: 0, blocked_until: null }] });
  connect.mockResolvedValue({ query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() });

  const { sendMail } = require('../config/email');
  sendMail.mockResolvedValue(true);
});

const { query } = require('../infrastructure/db');
query.mockResolvedValueOnce({
  rows: [{ failed_attempts: 5, blocked_until: new Date(Date.now() + 60000) }]
});




const mockRequest = (body) => ({ body, ip: '127.0.0.1' });
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('loginController', () => {
  afterEach(() => jest.clearAllMocks());

  // ---------------- loginUsuario ----------------
  describe('loginUsuario', () => {
    it('Error: correo y contraseña vacíos', async () => {
      const req = mockRequest({ correo: '', password: '' });
      const res = mockResponse();
      await loginUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 2,
        error: expect.objectContaining({ mensaje: "Errores de validación" })
      }));
    });

    it('Error: usuario no existe', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue(null);
      const req = mockRequest({ correo: 'test@correo.com', password: 'Test123!' });
      const res = mockResponse();
      await loginUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 3,
        error: expect.objectContaining({
            detalle: null,
            mensaje: "Usuario no encontrado"
        })
        }));

    });
    
    it('Caso límite: correo inválido', async () => {
      const req = mockRequest({ correo: 'invalid', password: 'Test123!' });
      const res = mockResponse();
      await loginUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 2,
        error: expect.objectContaining({ mensaje: "Errores de validación" })
      }));
    });
  });

  // ---------------- verificarCodigo ----------------
  describe('verificarCodigo', () => {
    it('Error: campos vacíos', async () => {
      const req = mockRequest({ correo: '', codigo: '' });
      const res = mockResponse();
      await verificarCodigo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 2,
        error: expect.objectContaining({ mensaje: "Errores de validación" })
      }));
    });

    it('Error: usuario no existe', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue(null);
      const req = mockRequest({ correo: 'test@correo.com', codigo: '123456' });
      const res = mockResponse();
      await verificarCodigo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 3,
        error: expect.objectContaining({ mensaje: "Usuario no encontrado", detalle: null })
        }));

    });


    it('Caso límite: código con letras', async () => {
      const req = mockRequest({ correo: 'test@correo.com', codigo: '12AB56' });
      const res = mockResponse();
      await verificarCodigo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 2,
        error: expect.objectContaining({ mensaje: "Errores de validación" })
      }));
    });
  });
});
