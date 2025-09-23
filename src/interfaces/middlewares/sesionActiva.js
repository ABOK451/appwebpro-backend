const UsuarioService = require('../../application/usuarioService');
const errorResponse = require('../../helpers/errorResponse');

const verificarSesionActiva = async (req, res, next) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(200).json(errorResponse("FALTA_CORREO", "Correo es requerido", null, 2));

    const tokenActivo = await UsuarioService.obtenerTokenActivo(correo);
    if (tokenActivo) {
      return res.status(200).json({
        mensaje: "Ya existe una sesión activa",
        codigo: 0,
        token: tokenActivo
      });
    }

    next();
  } catch (error) {
    console.error("Error verificarSesionActiva:", error);
    return res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al verificar sesión activa", error.message, 3));
  }
};

module.exports = { verificarSesionActiva };
