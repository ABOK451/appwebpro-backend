function errorResponse(mensaje, detalle = null, codigo = 1) {
  return {
    codigo,        
    error: {
      mensaje,
      detalle       
    }
  };
}

module.exports = errorResponse;
