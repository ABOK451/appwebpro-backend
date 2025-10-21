const { solicitarReset, resetConCodigo } = require('../interfaces/controllers/recuperarController');
const UsuarioService = require('../application/usuarioService');
const RecuperarService = require('../application/recuperarService');
const transporter = require('../config/email');
const bcrypt = require('bcrypt');

jest.mock('../application/usuarioService');
jest.mock('../application/recuperarService');
jest.mock('../config/email');
jest.mock('dns', () => ({
  lookup: jest.fn((_, cb) => cb(null, '127.0.0.1'))
}));


describe('RecuperarController', () => {

  describe('solicitarReset', () => {
    it('debe devolver error si el correo no existe', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue(null);
      const req = { body: { correo: 'test@correo.com' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await solicitarReset(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
  error: expect.objectContaining({
    mensaje: 'Usuario no encontrado'
  })
}));

    });

    it('debe enviar código si el usuario existe', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue({ id: 1, nombre: 'Alan', correo: 'test@correo.com' });
      RecuperarService.guardarCodigoReset.mockResolvedValue(true);
      transporter.sendMail.mockResolvedValue(true);

      const req = { body: { correo: 'test@correo.com' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await solicitarReset(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        mensaje: 'Código de verificación enviado al correo'
      }));
    });
  });

  describe('resetConCodigo', () => {
    it('debe devolver error si el código es inválido', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue({ id: 1, correo: 'test@correo.com' });
      RecuperarService.validarCodigoReset.mockResolvedValue(false);

      const req = { body: { correo: 'test@correo.com', codigo: '123456', nuevaPassword: 'Aa123456!' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await resetConCodigo(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
            mensaje: 'Código inválido o expirado'
        })
        }));
    });

    it('debe actualizar la contraseña si el código es válido', async () => {
      UsuarioService.buscarPorCorreo.mockResolvedValue({ id: 1, correo: 'test@correo.com' });
      RecuperarService.validarCodigoReset.mockResolvedValue(true);
      UsuarioService.actualizar.mockResolvedValue(true);
      RecuperarService.limpiarCodigoReset.mockResolvedValue(true);
      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');

      const req = { body: { correo: 'test@correo.com', codigo: '123456', nuevaPassword: 'Aa123456!' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await resetConCodigo(req, res);

      expect(UsuarioService.actualizar).toHaveBeenCalledWith('test@correo.com', { passwordHash: 'hashedPassword' });
     expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
  mensaje: 'Contraseña restablecida con éxito',
  codigo: 0
}));

    });
  });

});
