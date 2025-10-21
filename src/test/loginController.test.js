const { loginUsuario, verificarCodigo } = require('../../controllers/loginController');
const UsuarioService = require('../../application/usuarioService');
const RecuperarService = require('../../application/recuperarService');
const AuthService = require('../../application/authService');
const transporter = require('../../config/email');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../infrastructure/db');

jest.mock('../application/usuarioService');
jest.mock('../application/recuperarService');
jest.mock('../application/authService');
jest.mock('../config/email', () => ({ sendMail: jest.fn(() => Promise.resolve()) }));
jest.mock('bcrypt');
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(() => 'fake-jwt-token') }));
jest.mock('../infrastructure/utils/geolocation', () => ({
  obtenerUbicacionIP: jest.fn(() => Promise.resolve({ lat: 10, lng: 20 }))
}));
jest.mock('../infrastructure/db', () => ({
  connect: jest.fn(() => ({ query: jest.fn(), release: jest.fn() }))
}));


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
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Errores de validación" }));
    });

    it('Error: usuario no existe', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue(null);
      const req = mockRequest({ correo: 'test@correo.com', password: 'Test123!' });
      const res = mockResponse();
      await loginUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Usuario no encontrado" }));
    });

    it('Error: contraseña incorrecta', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue({ id: 1, password: 'hashed', blocked_until: null });
      bcrypt.compare.mockResolvedValue(false);
      const req = mockRequest({ correo: 'test@correo.com', password: 'Wrong123!' });
      const res = mockResponse();
      await loginUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Contraseña incorrecta" }));
    });

    it('Error: usuario bloqueado', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue({ id: 1, password: 'hashed', blocked_until: new Date(Date.now() + 60000) });
      const req = mockRequest({ correo: 'test@correo.com', password: 'Test123!' });
      const res = mockResponse();
      await loginUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: expect.stringContaining("Cuenta bloqueada") }));
    });

    it('Login correcto genera OTP y envía email', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue({ id: 1, password: 'hashed', nombre: 'Alan', blocked_until: null });
      bcrypt.compare.mockResolvedValue(true);
      UsuarioService.actualizarLogin.mockResolvedValue(true);
      RecuperarService.guardarCodigoReset.mockResolvedValue(true);
      const req = mockRequest({ correo: 'test@correo.com', password: 'Test123!' });
      const res = mockResponse();
      await loginUsuario(req, res);
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: expect.stringContaining("Código de verificación") }));
    });

    it('Caso límite: correo inválido', async () => {
      const req = mockRequest({ correo: 'invalid', password: 'Test123!' });
      const res = mockResponse();
      await loginUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Errores de validación" }));
    });

  });

  // ---------------- verificarCodigo ----------------
  describe('verificarCodigo', () => {

    it('Error: campos vacíos', async () => {
      const req = mockRequest({ correo: '', codigo: '' });
      const res = mockResponse();
      await verificarCodigo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Errores de validación" }));
    });

    it('Error: usuario no existe', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue(null);
      const req = mockRequest({ correo: 'test@correo.com', codigo: '123456' });
      const res = mockResponse();
      await verificarCodigo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Usuario no encontrado" }));
    });

    it('Error: código inválido', async () => {
      const usuario = { id: 1 };
      UsuarioService.buscarPorCorreo.mockResolvedValue(usuario);
      RecuperarService.validarCodigoReset.mockResolvedValue(false);
      const req = mockRequest({ correo: 'test@correo.com', codigo: '123456' });
      const res = mockResponse();
      await verificarCodigo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Código inválido o expirado" }));
    });

    it('Código válido: genera token y retorna sesión', async () => {
      const usuario = { id: 1, correo: 'test@correo.com', rol: 'user', nombre: 'Alan' };
      UsuarioService.buscarPorCorreo.mockResolvedValue(usuario);
      RecuperarService.validarCodigoReset.mockResolvedValue(true);
      RecuperarService.limpiarCodigoReset.mockResolvedValue(true);

      const client = { query: jest.fn(), release: jest.fn() };
      pool.connect.mockResolvedValue(client);
      client.query.mockResolvedValueOnce({ rows: [] }) 
        .mockResolvedValueOnce({}); 

      const req = mockRequest({ correo: 'test@correo.com', codigo: '123456' });
      const res = mockResponse();
      await verificarCodigo(req, res);
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Autenticación exitosa", token: 'fake-jwt-token' }));
    });

    it('Caso límite: código con letras', async () => {
      const req = mockRequest({ correo: 'test@correo.com', codigo: '12AB56' });
      const res = mockResponse();
      await verificarCodigo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: "Errores de validación" }));
    });

  });

});
