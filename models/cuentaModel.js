// models/cuentaModel.js
const { connect, executeQuery, closeConnection } = require('../config/database');

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
    return await executeQuery(
      connection,
      `SELECT mc.cuenta, mc.nombre, mcu.cuit, mc.zona, dt.valor AS nombre_zona
         FROM mcuenta mc
         LEFT JOIN mcuit mcu ON mc.uvaluecuit = mcu.uvalue
         LEFT JOIN dtabla dt ON dt.clave = mc.zona
                            AND dt.entidad = 'ZCOMER'
                            AND dt.orden = 'Z2'
        WHERE NVL(mc.baja, 0) = 0
          ${where}
        ORDER BY mc.cuenta`,
      binds,
      { fetchArraySize: 5000 }
    );
  } catch (err) {
    throw new Error('Error al obtener cuentas: ' + err.message);
  } finally {
    await closeConnection(connection);
  }
}

// Datos de contacto de las cuentas activas (teléfono y email de MCUENTA).
// Solo devuelve cuentas que tengan al menos uno de los dos.
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
    return await executeQuery(
      connection,
      `SELECT mc.cuenta, mc.nombre, mcu.cuit, mc.telefono, mc.email
         FROM mcuenta mc
         LEFT JOIN mcuit mcu ON mc.uvaluecuit = mcu.uvalue
        WHERE NVL(mc.baja, 0) = 0
          AND (mc.telefono IS NOT NULL OR mc.email IS NOT NULL)
          ${where}
        ORDER BY mc.cuenta`,
      binds,
      { fetchArraySize: 5000 }
    );
  } catch (err) {
    throw new Error('Error al obtener contactos: ' + err.message);
  } finally {
    await closeConnection(connection);
  }
}

module.exports = { getCuentas, getContactos };
