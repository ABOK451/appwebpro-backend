function errorResponse(mensaje, detalle = null, codigo = 1) {
  return {
    codigo,        // código general de la respuesta
    error: {
      mensaje,
      detalle       // puede ser string, objeto o arreglo de errores
    }
  };
}

module.exports = errorResponse;
