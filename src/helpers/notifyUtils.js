function notifyLowStock(producto) {
  console.log(`[ALERTA] Producto con bajo stock: ${producto.nombre} (Código: ${producto.codigo}, Stock: ${producto.stock})`);
}

module.exports = { notifyLowStock };
