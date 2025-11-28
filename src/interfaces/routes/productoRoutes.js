const express = require("express");
const router = express.Router();
const { crearProducto, listarProductos, listarPorCampo, actualizarProducto, eliminarProducto } = require('../controllers/productoController');

router.post('/productos/crear', crearProducto);
router.get('/productos/listar', listarProductos);
router.post('/productos/filtrar', listarPorCampo);
router.put('/productos/actualizar', actualizarProducto);
router.delete('/productos/eliminar', eliminarProducto);

module.exports = router;
