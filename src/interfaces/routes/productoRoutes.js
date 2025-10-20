const express = require('express');
const { crearProducto, listarProductos, actualizarProducto, eliminarProducto } = require('../controllers/productoController');
const router = express.Router();


router.post('/productos/crear', crearProducto);
router.post('/productos/listar', listarProductos);
router.put('/productos/actualizar', actualizarProducto);
router.delete('/productos/eliminar', eliminarProducto);

module.exports = router;