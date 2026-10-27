require('dotenv').config();
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [ oracledb.CLOB ];

// ORACLE_THIN=1 usa el modo thin (sin Instant Client), para servidores donde no se puede instalar.
if (process.env.ORACLE_THIN !== '1') {
  oracledb.initOracleClient({ });
}

let poolPromise = null;

// El pool se crea una sola vez y se reutiliza: abrir una conexión nueva por request es lo que más tarda.
function getPool() {
  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    }).catch(err => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

// Devuelve una conexión del pool; connection.close() la devuelve al pool, no la cierra.
async function connect() {
  try {
    const pool = await getPool();
    return await pool.getConnection();
  } catch (err) {
    console.error('Error en conexión a la BD:', err);
    throw err;
  }
}

async function executeQuery(connection, sql, binds = [], options = {}) {
  try {
    const result = await connection.execute(
      sql, 
      binds,
      { ...options, autoCommit: true }
    );
    return result.rows;
  } catch (err) {
    console.error('Error ejecutando query:', err);
    throw err;
  }
}

async function closeConnection(connection) {
  if (connection) {
    try {
      await connection.close();
    } catch (err) {
      console.error('Error cerrando conexión:', err);
    }
  }
}

module.exports = { 
  connect, 
  executeQuery,
  closeConnection 
};