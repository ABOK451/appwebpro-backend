const categoriaService = require("../../application/categoriaService");

const categoriaController = {
  listar: async function (req, res) {
  try {
    const categorias = await categoriaService.listarCategorias();
    return res.status(200).json({
      codigo: 0,
      mensaje: "Categorías obtenidas correctamente",
      categorias,
    });
  } catch (error) {
    console.error("Error al listar categorías:", error); 
    return res.status(500).json({
      codigo: 3,
      error: {
        codigo: "ERROR_SERVIDOR",
        mensaje: "Error al listar categorías",
      },
    });
  }
},


  buscarPorNombre: async function (req, res) {
    try {
      const { nombre } = req.body;
      const categoria = await categoriaService.buscarCategoriaPorNombre(nombre);
      return res.status(200).json({
        codigo: 0,
        mensaje: "Categoría encontrada correctamente",
        categoria,
      });
    } catch (error) {
      let codigo = 3;
      if (error.codigo === "NOMBRE_VACIO") codigo = 1;
      if (error.codigo === "CATEGORIA_NO_EXISTE") codigo = 2;
      return res.status(400).json({
        codigo,
        error: {
          codigo: error.codigo || "ERROR_SERVIDOR",
          mensaje: error.mensaje || "Error al buscar categoría",
        },
      });
    }
  },
};

module.exports = categoriaController;
