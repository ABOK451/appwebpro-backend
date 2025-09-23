const pool = require('../infrastructure/db');

class AuthService {
  static async guardarUbicacion(usuarioId, lat, lng) {
    try {
      if (!lat || !lng) return null;

      const res = await pool.query(
        `UPDATE usuario_login
         SET latitud = $1,
             longitud = $2,
             ultimo_login = NOW()
         WHERE usuario_id = $3
         RETURNING usuario_id, latitud, longitud, ultimo_login`,
        [lat, lng, usuarioId]
      );

      if (res.rows.length === 0) return null;
      return res.rows[0]; // Devolvemos la fila actualizada
    } catch (error) {
      console.error("Error en AuthService.guardarUbicacion:", error);
      throw new Error("No se pudo guardar la ubicación del usuario");
    }
  }
}

module.exports = AuthService;
