// utils/provincias.js

// MCUENTA.PCIA guarda la letra de provincia del código postal argentino (ej. 'X' = Córdoba).
const PROVINCIAS = {
  A: 'Salta',
  B: 'Buenos Aires',
  C: 'Ciudad Autónoma de Buenos Aires',
  D: 'San Luis',
  E: 'Entre Ríos',
  F: 'La Rioja',
  G: 'Santiago del Estero',
  H: 'Chaco',
  J: 'San Juan',
  K: 'Catamarca',
  L: 'La Pampa',
  M: 'Mendoza',
  N: 'Misiones',
  P: 'Formosa',
  Q: 'Neuquén',
  R: 'Río Negro',
  S: 'Santa Fe',
  T: 'Tucumán',
  U: 'Chubut',
  V: 'Tierra del Fuego',
  W: 'Corrientes',
  X: 'Córdoba',
  Y: 'Jujuy',
  Z: 'Santa Cruz',
};

// Devuelve el nombre de la provincia, o null si el código no está cargado o no se conoce.
function nombreProvincia(codigo) {
  return PROVINCIAS[String(codigo ?? '').trim().toUpperCase()] ?? null;
}

module.exports = { nombreProvincia };
