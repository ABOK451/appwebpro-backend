const express = require("express");
const categoriaController = require("../controllers/categoriaController");
const { extenderSesion } = require('../middlewares/sesionActiva');

const router = express.Router();

router.post("/categorias/buscar", extenderSesion,categoriaController.buscarPorNombre);
router.get("/categorias/listar", extenderSesion,categoriaController.listar); // <--- ruta GET


module.exports = router;
