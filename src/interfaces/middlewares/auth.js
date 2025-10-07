const jwt = require('jsonwebtoken');
const errorResponse = require('../../helpers/errorResponse');
const UsuarioService = require('../../application/usuarioService');

const verificarToken = (rolesPermitidos = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      console.log("[verificarToken] Authorization header:", authHeader);

      if (!authHeader) {
        console.log("[verificarToken] TOKEN_NO_PROPORCIONADO");
        return res.status(200).json(
          errorResponse("TOKEN_NO_PROPORCIONADO", "Token no proporcionado", null, 1)
        );
      }

      const token = authHeader.split(' ')[1];
      console.log("[verificarToken] Token extraído:", token);

      if (!token) {
        console.log("[verificarToken] TOKEN_INVALIDO");
        return res.status(200).json(
          errorResponse("TOKEN_INVALIDO", "Token inválido", null, 1)
        );
      }

      // Verificar JWT
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
        console.log("[verificarToken] Payload verificado:", payload);
      } catch (err) {
        console.log("[verificarToken] ERROR JWT:", err.message);
        return res.status(200).json(
          errorResponse("TOKEN_INVALIDO_O_EXPIRADO", "Token inválido o expirado", err.message, 3)
        );
      }

      // Verificar roles
      if (rolesPermitidos.length && !rolesPermitidos.includes(payload.rol)) {
        console.log("[verificarToken] PERMISO_DENEGADO para rol:", payload.rol);
        return res.status(200).json(
          errorResponse("PERMISO_DENEGADO", "No tienes permisos para acceder a este recurso", null, 2)
        );
      }

      // Extender token si falta poco
      const ahora = Math.floor(Date.now() / 1000);
      const tiempoRestante = payload.exp - ahora;
      console.log("[verificarToken] Tiempo restante del token (s):", tiempoRestante);

      const extension = 3 * 60; // 3 minutos
      if (tiempoRestante <= 5 * 60) { 
        console.log("[verificarToken] Extendiéndose token por 3 minutos");
        const nuevoToken = jwt.sign(
          { id: payload.id, correo: payload.correo, rol: payload.rol },
          process.env.JWT_SECRET,
          { expiresIn: `${tiempoRestante + extension}s` }
        );

        const nuevaExpiracion = new Date(Date.now() + (tiempoRestante + extension) * 1000);
        console.log("[verificarToken] Guardando token extendido en DB:", nuevoToken);
        await UsuarioService.guardarToken(payload.id, nuevoToken, nuevaExpiracion);

        res.setHeader('x-refresh-token', nuevoToken);
      }

      req.usuario = payload;
      console.log("[verificarToken] Usuario agregado a req.usuario");
      next();

    } catch (error) {
      console.error("[verificarToken] ERROR NO CONTROLADO:", error);
      return res.status(200).json(
        errorResponse("ERROR_SERVIDOR", "Error al verificar token", error.message, 3)
      );
    }
  };
};

module.exports = { verificarToken };
