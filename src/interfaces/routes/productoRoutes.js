const express = require('express');
const { crearProducto, listarProductos, actualizarProducto, eliminarProducto, listarPorNombre, listarPorCategoria, listarPorProveedor } = require('../controllers/productoController');
const router = express.Router();


router.post('/productos/crear', crearProducto);
router.get('/productos/listar', listarProductos);
router.get('/productos/filtro/nombre/:nombre', listarPorNombre);
router.get('/productos/filtro/categoria/:categoria', listarPorCategoria);
router.get('/productos/filtro/proveedor/:proveedor', listarPorProveedor);
router.put('/productos/actualizar', actualizarProducto);
router.delete('/productos/eliminar', eliminarProducto);

module.exports = router;