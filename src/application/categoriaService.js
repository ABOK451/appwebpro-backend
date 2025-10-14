const categoriaRepository = require("../repository/categoriaRepository");

const categoriaService = {
  listarCategorias: async function () {
    return await categoriaRepository.listar();
  },

  buscarCategoriaPorNombre: async function (nombre) {
    if (!nombre || nombre.trim() === "") {
      throw { codigo: "NOMBRE_VACIO", mensaje: "El nombre de la categoría no debe estar vacío" };
    }

    const categoria = await categoriaRepository.obtenerPorNombre(nombre);
    if (!categoria) {
      throw { codigo: "CATEGORIA_NO_EXISTE", mensaje: `No existe la categoría con nombre '${nombre}'` };
    }
    return categoria;
  },
};

module.exports = categoriaService;
