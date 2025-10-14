const express = require("express");
const categoriaController = require("../controllers/categoriaController");
const router = express.Router();

router.post("/categorias/buscar", categoriaController.buscarPorNombre);
router.get("/categorias/listar", categoriaController.listar); // <--- ruta GET


module.exports = router;
