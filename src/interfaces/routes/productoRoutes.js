const express = require('express');
const { crearProducto, listarProductos, actualizarProducto, eliminarProducto } = require('../controllers/productoController');
const router = express.Router();
const { extenderSesion } = require('../middlewares/sesionActiva');


router.post('/productos/crear',extenderSesion, crearProducto);
router.post('/productos/listar',extenderSesion, listarProductos);
router.put('/productos/actualizar', extenderSesion,actualizarProducto);
router.delete('/productos/eliminar',extenderSesion, eliminarProducto);

module.exports = router;