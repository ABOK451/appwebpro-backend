const pool = require("../infrastructure/db");

const categoriaRepository = {
  listar: async function () {
    const result = await pool.query("SELECT id, nombre FROM categorias");
    return result.rows;
  },

  obtenerPorNombre: async function (nombre) {
    const result = await pool.query(
      "SELECT id, nombre FROM categorias WHERE LOWER(nombre) = LOWER($1)",
      [nombre]
    );
    return result.rows[0] || null;
  },
};

module.exports = categoriaRepository;
