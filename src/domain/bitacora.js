class Bitacora {
  constructor(id, codigo_producto, tipo_movimiento, cantidad, descripcion, id_usuario, fecha) {
    this.id = id;
    this.codigo_producto = codigo_producto;
    this.tipo_movimiento = tipo_movimiento;
    this.cantidad = cantidad;
    this.descripcion = descripcion;
    this.id_usuario = id_usuario;
    this.fecha = fecha;
  }
}

module.exports = Bitacora;
