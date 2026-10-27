// utils/normalizar.js

// Oracle devuelve algunos códigos y nombres con espacios al inicio o al final (ej. ' ARREGS'):
// se recortan todos los textos de la fila. Los valores que no son texto quedan igual.
function limpiarFila(fila) {
  const limpia = {};
  for (const [clave, valor] of Object.entries(fila)) {
    limpia[clave] = typeof valor === 'string' ? valor.trim() : valor;
  }
  return limpia;
}

function limpiarFilas(filas) {
  return filas.map(limpiarFila);
}

module.exports = { limpiarFila, limpiarFilas };
