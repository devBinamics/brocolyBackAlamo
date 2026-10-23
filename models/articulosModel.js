// models/articulosModel.js
const { connect, executeQuery, closeConnection } = require('../config/database');

// p.precio es el precio de venta SIN IVA. El precio con IVA no está en la DB:
// se calcula con la alícuota según f.civa (1=21%, 2=10,5%, 3=27%).
// Si civa no está definido, ALICUOTA e importes con IVA quedan en NULL.
// TIPOMONEDA se devuelve como código de divisa (ARS, USD, ...): en la DB 'PE' = pesos.
// Los importes netos llevan el sufijo _SIN_IVA en el nombre de la columna.
async function getArticulos(articulo = null) {
  let connection;
  try {
    connection = await connect();
    let query = `
      SELECT
        a.UNINEGO,
        a.UNIDAD_NEGOCIO,
        a.CATEGORIA,
        a.SUBCATEGORIA,
        a.SKU,
        a.DENOMINACION,
        a.PROVEEDOR,
        a.PROVEEDOR_DESCRIP,
        a.SUBGRUPO1,
        a.SUBGRUPO2,
        a.CENTROCOSTO,
        a.SECCIONFIS,
        a.ZONA,
        a.LISTA,
        a.DEPOSITO,
        a.TIPOMONEDA,
        a.COSTOTOTAL_SIN_IVA,
        a.MARCACION,
        a.PRECIO_SIN_IVA,
        a.PRECIOANTERIOR_SIN_IVA,
        a.CIVA,
        a.CIVA_DESC,
        a.ALICUOTA,
        ROUND(a.PRECIO_SIN_IVA * (1 + a.ALICUOTA / 100), 2) AS PRECIO_CON_IVA,
        ROUND(a.PRECIOANTERIOR_SIN_IVA * (1 + a.ALICUOTA / 100), 2) AS PRECIOANTERIOR_CON_IVA,
        a.FECHA_ULTIMA_COMPRA,
        a.FECHA_ULTIMO_CAMBIO_PRECIO,
        a.BAJA
      FROM (
        SELECT p.uninego AS UNINEGO,
               s.valor AS UNIDAD_NEGOCIO,
               f.padre AS CATEGORIA,
               c.valor AS SUBCATEGORIA,
               f.articulo AS SKU,
               f.denominacion AS DENOMINACION,
               f.grupo AS PROVEEDOR,
               g.valor AS PROVEEDOR_DESCRIP,
               f.subgrupo1 AS SUBGRUPO1,
               f.subgrupo2 AS SUBGRUPO2,
               f.centrocosto AS CENTROCOSTO,
               f.seccionfis AS SECCIONFIS,
               p.zona AS ZONA,
               p.lista AS LISTA,
               p.deposito AS DEPOSITO,
               CASE f.tipomoneda
                   WHEN 'PE' THEN 'ARS'
                   WHEN 'USD' THEN 'USD'
                   ELSE NULL
               END AS TIPOMONEDA,
               f.costototal AS COSTOTOTAL_SIN_IVA,
               p.marcacion AS MARCACION,
               p.precio AS PRECIO_SIN_IVA,
               p.precioanterior AS PRECIOANTERIOR_SIN_IVA,
               f.civa AS CIVA,
               CASE f.civa
                   WHEN 1 THEN '21%'
                   WHEN 2 THEN '10,5%'
                   WHEN 3 THEN '27%'
                   ELSE 'SIN DEFINIR'
               END AS CIVA_DESC,
               CASE f.civa
                   WHEN 1 THEN 21
                   WHEN 2 THEN 10.5
                   WHEN 3 THEN 27
                   ELSE NULL
               END AS ALICUOTA,
               f.fecultcompra AS FECHA_ULTIMA_COMPRA,
               p.fecultcambio AS FECHA_ULTIMO_CAMBIO_PRECIO,
               p.baja AS BAJA
        FROM famstock f
             LEFT JOIN dtabla s
                 ON s.entidad = 'SECCVT'
                AND s.orden = '02FA'
                AND s.clave = f.seccionfis
             LEFT JOIN dtabla c
                 ON c.entidad = 'CCOSTO'
                AND c.orden = '02FA'
                AND c.clave = f.centrocosto
             LEFT JOIN dtabla g
                 ON g.entidad = 'GRUPO'
                AND g.orden = '02FA'
                AND g.clave = f.grupo
             LEFT JOIN pstock p
                 ON p.empresa = f.empresa
                AND p.articulo = f.articulo
        ${articulo ? 'WHERE f.articulo = :articulo' : ''}
      ) a
      ORDER BY a.SECCIONFIS, a.SKU, a.LISTA, a.UNINEGO, a.ZONA
    `;

    const binds = articulo ? { articulo } : {};
    // fetchArraySize por defecto es 100: en el listado completo son cientos de viajes a Oracle.
    const rows = await executeQuery(connection, query, binds, { fetchArraySize: 5000 });
    console.log('Rows obtenidos de artículos:', rows.length);
    return rows;

  } catch (err) {
    console.error('Error en getArticulos:', err);
    throw new Error('Error al obtener artículos: ' + err.message);
  } finally {
    if (connection) {
      await closeConnection(connection);
    }
  }
}

// Salida reducida para el importador de catálogo, reutilizando getArticulos.
// El grupo del artículo es el proveedor. Divisa, descripción e imagen no existen en la DB, por eso no se devuelven.
async function getArticulosCatalogo(sku = null) {
  const rows = await getArticulos(sku);
  return rows.map(r => ({
    NOMBRE: r.DENOMINACION,
    SKU: r.SKU,
    PRECIO: r.PRECIO_CON_IVA,
    TIPOMONEDA: r.TIPOMONEDA,
    COSTO: r.COSTOTOTAL_SIN_IVA,
    PROVEEDOR: r.PROVEEDOR_DESCRIP,
    CATEGORIA: r.CATEGORIA,
    SUBCATEGORIA: r.SUBCATEGORIA,
    UNIDAD_NEGOCIO: r.UNIDAD_NEGOCIO,
  }));
}

module.exports = { getArticulos, getArticulosCatalogo };
