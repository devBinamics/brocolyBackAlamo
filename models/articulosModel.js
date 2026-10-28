// models/articulosModel.js
const { connect, executeQuery, closeConnection } = require('../config/database');
const { limpiarFilas } = require('../utils/normalizar');

// p.precio es el precio de venta SIN IVA. El precio con IVA no está en la DB:
// se calcula con la alícuota según f.civa (1=21%, 2=10,5%, 3=27%).
// Si civa no está definido, ALICUOTA e importes con IVA quedan en NULL.
// TIPOMONEDA se devuelve como código de divisa (ARS, USD, ...): en la DB 'PE' = pesos.
// Los importes netos llevan el sufijo _SIN_IVA en el nombre de la columna.
// unico=true devuelve una sola fila por SKU (ver getArticulosCatalogo), filtrando en la DB para no traer las demás.
// secciones es una lista de códigos de sección fiscal (f.seccionfis, ej. ['2','3']): trae solo los artículos de esas secciones.
// conPrecio=true trae solo los que tienen un precio de lista mayor a 0 en pstock (TIENE_PRECIO = true).
// excluirSecciones es una lista de códigos de sección fiscal que se dejan afuera (los artículos sin sección se mantienen).
async function getArticulos(articulo = null, { unico = false, secciones = [], conPrecio = false, excluirSecciones = [] } = {}) {
  let connection;
  try {
    connection = await connect();
    const binds = {};
    const condiciones = [];
    if (articulo) {
      condiciones.push('TRIM(f.articulo) = TRIM(:articulo)');
      binds.articulo = articulo;
    }
    if (secciones.length) {
      const nombres = secciones.map((seccion, i) => { binds[`seccion${i}`] = seccion; return `:seccion${i}`; });
      condiciones.push(`TRIM(f.seccionfis) IN (${nombres.join(', ')})`);
    }
    if (excluirSecciones.length) {
      const nombres = excluirSecciones.map((seccion, i) => { binds[`excluir${i}`] = seccion; return `:excluir${i}`; });
      condiciones.push(`(f.seccionfis IS NULL OR TRIM(f.seccionfis) NOT IN (${nombres.join(', ')}))`);
    }
    if (conPrecio) condiciones.push('p.precio > 0');
    let query = `
      SELECT * FROM (
      SELECT
        ${unico ? `ROW_NUMBER() OVER (
          PARTITION BY a.SKU
          ORDER BY CASE WHEN NVL(a.BAJA, 0) = 0 THEN 0 ELSE 1 END,
                   CASE WHEN NVL(a.PRECIO_SIN_IVA, 0) > 0 THEN 0 ELSE 1 END,
                   CASE WHEN a.LISTA_VIGENTE = 1 THEN 0 ELSE 1 END,
                   a.FECHA_ULTIMO_CAMBIO_PRECIO DESC NULLS LAST,
                   a.LISTA, a.UNINEGO, a.ZONA
        ) AS RN,` : ''}
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
        a.LISTA_NOMBRE,
        a.LISTA_VIGENTE,
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
               l.detlista AS LISTA_NOMBRE,
               -- 1 si la lista está sin baja y hoy está dentro de su período de vigencia (los períodos de LISTAPRE son días
               -- desde 1800-12-28); NULL si el artículo no tiene fila de precios.
               CASE WHEN p.lista IS NULL THEN NULL
                    WHEN NVL(l.baja, 0) = 0
                     AND (TRUNC(SYSDATE) - DATE '1800-12-28') BETWEEN NVL(l.fechavigencia, 0) AND NVL(l.hastavigencia, 999999)
                    THEN 1 ELSE 0 END AS LISTA_VIGENTE,
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
             LEFT JOIN listapre l
                 ON l.empresa = p.empresa
                AND l.uninego = p.uninego
                AND NVL(l.zona, '~') = NVL(p.zona, '~')
                AND l.lista = p.lista
        ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
      ) a
      ) r
      ${unico ? 'WHERE r.RN = 1' : ''}
      ORDER BY r.SECCIONFIS, r.SKU, r.LISTA, r.UNINEGO, r.ZONA
    `;

    // fetchArraySize por defecto es 100: en el listado completo son cientos de viajes a Oracle.
    const t0 = Date.now();
    const rows = await executeQuery(connection, query, binds, { fetchArraySize: 5000 });
    console.log(`Rows obtenidos de artículos: ${rows.length} en ${Date.now() - t0} ms (query + fetch)`);
    // TIENE_PRECIO: hay un precio de lista cargado (distinto de 0), aunque el precio con IVA pueda quedar en null por IVA sin definir.
    return limpiarFilas(rows).map(r => ({
      ...r,
      LISTA_VIGENTE: r.LISTA_VIGENTE === null ? null : r.LISTA_VIGENTE === 1,
      TIENE_PRECIO: Number(r.PRECIO_SIN_IVA) > 0,
    }));

  } catch (err) {
    console.error('Error en getArticulos:', err);
    throw new Error('Error al obtener artículos: ' + err.message);
  } finally {
    if (connection) {
      await closeConnection(connection);
    }
  }
}

// Sección fiscal '5' = "NO USAR" (dtabla SECCVT): no se publica en el catálogo.
const SECCIONES_EXCLUIDAS_CATALOGO = ['5'];

// Caché de las respuestas completas (sin sku, secciones ni conPrecio): evita correr la query de Oracle en cada carga o reintento.
// Si ya hay una consulta en curso, los pedidos simultáneos esperan la misma.
const CACHE_TTL_MS = 10 * 60 * 1000;

function conCache(consultar) {
  let cache = { data: null, expira: 0 };
  let enCurso = null;
  return async function ({ refresh = false } = {}) {
    if (!refresh && cache.data && Date.now() < cache.expira) return cache.data;
    if (!enCurso) {
      enCurso = consultar()
        .then(data => {
          cache = { data, expira: Date.now() + CACHE_TTL_MS };
          return data;
        })
        .finally(() => { enCurso = null; });
    }
    return enCurso;
  };
}

// Salida reducida para el importador de catálogo, reutilizando getArticulos.
// Una fila por SKU: se prefiere la que no está de baja, luego la que tiene precio mayor a 0, luego la de una lista vigente,
// luego la de cambio de precio más reciente y, por último, la de menor LISTA, UNINEGO y ZONA. Si ninguna lista está vigente
// se usa la que exista. Los datos de la lista (LISTA_NOMBRE, LISTA_VIGENTE) solo se devuelven en /api/articulos-control.
// GRUPO es la descripción del grupo del artículo (famstock.grupo traducido con dtabla GRUPO),
// PADRE es famstock.padre, CENTRO_COSTO la descripción de famstock.centrocosto (dtabla CCOSTO) y
// SECCIONFIS la descripción de famstock.seccionfis (dtabla SECCVT; el código es el que usa ?seccion=). Divisa, descripción e imagen no existen en la DB, por eso no se devuelven.
async function consultarCatalogo(sku, secciones = [], conPrecio = false) {
  const rows = await getArticulos(sku, { unico: true, secciones, conPrecio, excluirSecciones: SECCIONES_EXCLUIDAS_CATALOGO });
  return rows.map(r => ({
    NOMBRE: r.DENOMINACION,
    SKU: r.SKU,
    PRECIO: r.PRECIO_CON_IVA,
    TIPOMONEDA: r.TIPOMONEDA,
    COSTO: r.COSTOTOTAL_SIN_IVA,
    GRUPO: r.PROVEEDOR_DESCRIP,
    PADRE: r.CATEGORIA,
    CENTRO_COSTO: r.SUBCATEGORIA,
    SECCIONFIS: r.UNIDAD_NEGOCIO,
    TIENE_PRECIO: r.TIENE_PRECIO,
  }));
}

// Salida mínima para cargar costos: solo SKU y COSTO (costo total sin IVA), una fila por SKU y sin la sección excluida del catálogo.
async function consultarCostos(sku, secciones = [], conPrecio = false) {
  const rows = await getArticulos(sku, { unico: true, secciones, conPrecio, excluirSecciones: SECCIONES_EXCLUIDAS_CATALOGO });
  return rows.map(r => ({
    SKU: r.SKU,
    COSTO: r.COSTOTOTAL_SIN_IVA,
  }));
}

const catalogoCompleto = conCache(() => consultarCatalogo(null));
const costosCompleto = conCache(() => consultarCostos(null));
const controlCompleto = conCache(() => getArticulos(null));

// Con sku, secciones o conPrecio consulta siempre la DB. Sin ninguno de los tres usa el caché (refresh=true lo fuerza).
async function getArticulosCatalogo(sku = null, { refresh = false, secciones = [], conPrecio = false } = {}) {
  if (sku || secciones.length || conPrecio) return consultarCatalogo(sku, secciones, conPrecio);
  return catalogoCompleto({ refresh });
}

// Detalle completo (una fila por artículo y lista de precios), con los mismos parámetros y caché que el catálogo.
async function getArticulosControl(sku = null, { refresh = false, secciones = [], conPrecio = false } = {}) {
  if (sku || secciones.length || conPrecio) return getArticulos(sku, { secciones, conPrecio });
  return controlCompleto({ refresh });
}

// Costos por SKU, con los mismos parámetros y caché que el catálogo.
async function getArticulosCostos(sku = null, { refresh = false, secciones = [], conPrecio = false } = {}) {
  if (sku || secciones.length || conPrecio) return consultarCostos(sku, secciones, conPrecio);
  return costosCompleto({ refresh });
}

module.exports = { getArticulos, getArticulosCatalogo, getArticulosControl, getArticulosCostos };
