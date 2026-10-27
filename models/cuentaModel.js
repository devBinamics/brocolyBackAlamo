// models/cuentaModel.js
const { connect, executeQuery, closeConnection } = require('../config/database');
const { limpiarFilas } = require('../utils/normalizar');
const { nombreProvincia } = require('../utils/provincias');

// Cuentas activas (NVL(baja,0) = 0). Con cuenta devuelve esa cuenta; con buscar filtra por código o nombre.
async function getCuentas({ cuenta, buscar } = {}) {
  let connection;
  try {
    connection = await connect();
    let where = '';
    let binds = {};
    if (cuenta) {
      where = 'AND mc.cuenta = :cuenta';
      binds = { cuenta };
    } else if (buscar) {
      where = 'AND (mc.cuenta LIKE :buscar OR UPPER(mc.nombre) LIKE UPPER(:buscar))';
      binds = { buscar: `%${buscar}%` };
    }
    const filas = await executeQuery(
      connection,
      `SELECT mc.cuenta, mc.nombre, mcu.cuit, mc.zona, dt.valor AS nombre_zona,
              mc.centro, cop.descripcion AS coper_descrip
         FROM mcuenta mc
         LEFT JOIN mcuit mcu ON mc.uvaluecuit = mcu.uvalue
         LEFT JOIN tb_coper cop ON cop.codigo = TO_CHAR(mc.centro)
         LEFT JOIN dtabla dt ON dt.clave = mc.zona
                            AND dt.entidad = 'ZCOMER'
                            AND dt.orden = 'Z2'
        WHERE NVL(mc.baja, 0) = 0
          ${where}
        ORDER BY mc.cuenta`,
      binds,
      { fetchArraySize: 5000 }
    );
    return limpiarFilas(filas);
  } catch (err) {
    throw new Error('Error al obtener cuentas: ' + err.message);
  } finally {
    await closeConnection(connection);
  }
}

// Datos de contacto de las cuentas activas: teléfono, fax, email y domicilio de MCUENTA.
// Los emails están repartidos en dos columnas (EMAIL y CORREO): se usa EMAIL y, si está vacío, CORREO.
// Solo devuelve cuentas que tengan al menos teléfono, fax o email.
async function getContactos({ cuenta, buscar } = {}) {
  let connection;
  try {
    connection = await connect();
    let where = '';
    let binds = {};
    if (cuenta) {
      where = 'AND mc.cuenta = :cuenta';
      binds = { cuenta };
    } else if (buscar) {
      where = 'AND (mc.cuenta LIKE :buscar OR UPPER(mc.nombre) LIKE UPPER(:buscar))';
      binds = { buscar: `%${buscar}%` };
    }
    const filas = await executeQuery(
      connection,
      `SELECT mc.cuenta, mc.nombre, mcu.cuit, mc.telefono, mc.fax,
              COALESCE(TRIM(mc.email), TRIM(mc.correo)) AS email,
              mc.domici, mc.nrodomic, mc.piso, mc.departamento,
              mc.locali, mc.pcia, mc.cpostal
         FROM mcuenta mc
         LEFT JOIN mcuit mcu ON mc.uvaluecuit = mcu.uvalue
        WHERE NVL(mc.baja, 0) = 0
          AND (mc.telefono IS NOT NULL OR mc.fax IS NOT NULL
               OR mc.email IS NOT NULL OR mc.correo IS NOT NULL)
          ${where}
        ORDER BY mc.cuenta`,
      binds,
      { fetchArraySize: 5000 }
    );
    return limpiarFilas(filas).map(armarContacto);
  } catch (err) {
    throw new Error('Error al obtener contactos: ' + err.message);
  } finally {
    await closeConnection(connection);
  }
}

// Calle y número, con piso y departamento si los tiene (ej. "SARMIENTO 123 PISO 2 DTO B").
function armarContacto({ DOMICI, NRODOMIC, PISO, DEPARTAMENTO, LOCALI, PCIA, CPOSTAL, ...resto }) {
  const domicilio = [
    DOMICI,
    NRODOMIC || null,
    PISO ? `PISO ${PISO}` : null,
    DEPARTAMENTO ? `DTO ${DEPARTAMENTO}` : null,
  ].filter(Boolean).join(' ');
  return {
    ...resto,
    DOMICILIO: domicilio || null,
    LOCALIDAD: LOCALI || null,
    PROVINCIA: nombreProvincia(PCIA),
    PROVINCIA_CODIGO: PCIA || null,
    CODIGO_POSTAL: CPOSTAL || null,
  };
}

module.exports = { getCuentas, getContactos };
