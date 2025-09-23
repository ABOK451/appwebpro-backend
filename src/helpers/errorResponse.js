function errorResponse(codigo, mensaje, detalle = null, codigoEstado = 1) {
  return {
    codigo: codigoEstado,       
    error: { codigo, mensaje, detalle }
  };
}

module.exports = errorResponse;
