require('dotenv').config();
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [ oracledb.CLOB ];

oracledb.initOracleClient({ });

async function connect() {
  try {
    console.log('Conectando a la BD... ');
    return await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
      libMode: oracledb.THICK
    });
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