const UsuarioService = require('../../application/usuarioService');
const errorResponse = require('../../helpers/errorResponse');

const verificarSesionActiva = async (req, res, next) => {
  try {
    const { correo } = req.body;
    if (!correo) {
      return res.status(200).json(
        errorResponse("FALTA_CORREO", "Correo es requerido", null, 2)
      );
    }

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) {
      return res.status(200).json(
        errorResponse("NO_ENCONTRADO", "Usuario no encontrado", null, 3)
      );
    }

    const login = await UsuarioService.obtenerLogin(usuario.id);

    if (login && login.sesion_activa === true) {
      return res.status(200).json({
        mensaje: "Ya existe una sesión activa",
        codigo: 0,
        token: login.token
      });
    }

    next();
  } catch (error) {
    console.error("Error verificarSesionActiva:", error);
    return res.status(200).json(
      errorResponse("ERROR_SERVIDOR", "Error al verificar sesión activa", error.message, 3)
    );
  }
};

module.exports = { verificarSesionActiva };
