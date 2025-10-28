const express = require('express');
const { crearProducto, listarProductos, listarPorCampo, actualizarProducto, eliminarProducto } = require('../controllers/productoController');
const router = express.Router();

router.post('/productos/crear', crearProducto);
router.get('/productos/listar', listarProductos);  
router.post('/productos/filtrar', listarPorCampo); 
router.put('/productos/actualizar', actualizarProducto);
router.delete('/productos/eliminar', eliminarProducto);

module.exports = router;
