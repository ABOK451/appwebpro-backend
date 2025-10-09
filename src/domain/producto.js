class Producto {
  constructor(codigo, nombre, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen, fecha_ingreso, categoria_nombre = null) {
    this.codigo = codigo;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.cantidad = cantidad;
    this.stock = stock;
    this.precio = precio;
    this.proveedor = proveedor;
    this.id_categoria = id_categoria;
    this.imagen = imagen;
    this.fecha_ingreso = fecha_ingreso;
    this.categoria_nombre = categoria_nombre; 
  }
}

module.exports = Producto;
