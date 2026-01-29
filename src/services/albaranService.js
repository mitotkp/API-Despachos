import { z } from "zod";
import { getConnection, sql } from "../config/db.js";
import { cQuerys } from "../querys/querys.js";
import { searchSchema } from "../schemas/searchSchemas.js";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

const albaranIdSchema = z.object({
  serie: z.string().min(1),
  numero: z.coerce.number().int().positive(),
});

export class cAlbaranService {
  /**
   * Obtiene una lista páginada de los albaranes
   * @param {{ page?: number, limit?: number }} params
   */

  static async getAll(params) {
    const { page, limit } = paginationSchema.parse(params);
    const offset = (page - 1) * limit;

    const pool = await getConnection();

    const [dataResult, countResult] = await Promise.all([
      pool
        .request()
        .input("OFFSET", sql.Int, offset)
        .input("LIMIT", sql.Int, limit)
        .query(cQuerys.getAlbaranesVenta),
      pool.request().query(cQuerys.getCountAlbaranVenta),
    ]);

    const total = countResult.recordset[0].total;

    return {
      data: dataResult.recordset,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
 * Búsqueda de albaranes
 * @param {z.infer<typeof searchSchema>} params
 */

  static async search(params) {

    const filters = searchSchema.parse(params);
    const pool = await getConnection();
    const request = pool.request();

    let whereClause = "WHERE AVC.N = 'B'";

    if (filters.serie) {
      whereClause += ` AND AVC.NUMSERIE = @SERIE`;
      request.input("SERIE", sql.VarChar, filters.serie);
    }

    if (filters.numero) {
      whereClause += ` AND AVC.NUMALBARAN = @NUMERO`;
      request.input("NUMERO", sql.Int, filters.numero);
    }

    if (filters.codCliente) {
      whereClause += ` AND AVC.CODCLIENTE = @CODCLIENTE`;
      request.input("CODCLIENTE", sql.Int, filters.codCliente);
    }

    if (filters.fechaDesde) {
      whereClause += ` AND AVC.FECHA >= @FECHADESDE`;
      request.input("FECHADESDE", sql.Date, filters.fechaDesde);
    }

    if (filters.fechaHasta) {
      whereClause += ` AND AVC.FECHA <= @FECHAHASTA`;
      request.input("FECHAHASTA", sql.Date, filters.fechaHasta);
    }

    if (filters.termino) {
      whereClause += ` AND (C.NOMBRECLIENTE LIKE '%' + @TERMINO + '%' OR C.NIF20 LIKE '%' + @TERMINO + '%') `;
      request.input("TERMINO", sql.VarChar, `%${filters.termino}%`);
    }

    const offset = (filters.page - 1) * filters.limit;
    request.input("OFFSET", sql.Int, offset);
    request.input("LIMIT", sql.Int, filters.limit);

    const queryData = `
      SELECT 
          AVC.NUMSERIE
          , AVC.NUMALBARAN
          , AVC.NUMSERIEFAC
          , AVC.NUMFAC
          , AVC.FACTURADO
          , AVC.FECHA
          , AVC.CODCLIENTE
          , ROUND(rip.F_GET_COTIZACION_RIP(AVC.TOTALNETO, AVC.FECHA, AVC.FACTORMONEDA, AVC.CODMONEDA, 1), 2) TOTALNETO_BS
          , ROUND(rip.F_GET_COTIZACION_RIP(AVC.TOTALNETO, AVC.FECHA, AVC.FACTORMONEDA, AVC.CODMONEDA, 2), 2) TOTALNETO_USD
          , C.NOMBRECLIENTE
          , C.NIF20
          , C.DIRECCION1
          ,(
          SELECT 
              AVL.CODARTICULO
            , MAX(AVL.DESCRIPCION) AS DESCRIPCION
            , ROUND((rip.F_GET_COTIZACION_RIP(MAX(AVL.PRECIO), AVC.FECHA, AVC.FACTORMONEDA, AVC.CODMONEDA, 1 )), 2) PRECIOBS
            , ROUND((rip.F_GET_COTIZACION_RIP(MAX(AVL.PRECIO), AVC.FECHA, AVC.FACTORMONEDA, AVC.CODMONEDA, 2 )), 2) PRECIOUSD
            , MAX(AVL.REFERENCIA) AS REFERENCIA
            , MAX(AVL.CODALMACEN) AS ALMACEN
            , MIN(AL.TALLA) AS TALLA
            , MIN(AL.COLOR) AS COLOR
            , SUM(AVL.UNIDADESTOTAL) AS CANTIDAD
        FROM 
            ALBVENTALIN AVL
            LEFT JOIN ARTICULOSLIN AL ON AVL.CODARTICULO = AL.CODARTICULO AND AVL.TALLA = AL.TALLA AND AVL.COLOR = AL.COLOR
            LEFT JOIN ARTICULOS A ON AVL.CODARTICULO = A.CODARTICULO
        WHERE
            AVL.NUMSERIE = AVC.NUMSERIE
            AND AVL.NUMALBARAN = AVC.NUMALBARAN
            AND AVL.N = AVC.N
        GROUP BY 
            AVL.CODARTICULO
        FOR JSON PATH
        ) AS items
      FROM
        ALBVENTACAB AVC
        LEFT JOIN CLIENTES C ON AVC.CODCLIENTE = C.CODCLIENTE
      ${whereClause}
      ORDER BY
        AVC.NUMSERIE DESC, 
        AVC.NUMALBARAN DESC
      OFFSET @OFFSET ROWS
      FETCH NEXT @LIMIT ROWS ONLY;
    `;

    const queryCount = `
      SELECT COUNT(*) AS total
      FROM ALBVENTACAB AVC
      LEFT JOIN CLIENTES C ON AVC.CODCLIENTE = C.CODCLIENTE
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      request.query(queryData),

      pool.request()
        .input("SERIE", sql.VarChar, filters.serie)
        .input("NUMERO", sql.Int, filters.numero)
        .input("CODCLIENTE", sql.Int, filters.codCliente)
        .input("FECHADESDE", sql.Date, filters.fechaDesde)
        .input("FECHAHASTA", sql.Date, filters.fechaHasta)
        .input("TERMINO", sql.VarChar, `%${filters.termino}%`)
        .query(queryCount)
    ]);

    const albaranes = dataResult.recordset.map(row => {

      const { items, ITEMS, ...restoDatos } = row;

      const jsonString = items || ITEMS;

      return {
        ...restoDatos,
        items: jsonString ? JSON.parse(jsonString) : []
      };
    });

    const total = countResult.recordset[0].total;

    return {
      data: albaranes,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  /**
   * Obtiene un albaran y sus detalles
   * @param {string} serie
   * @param {number} numero
   */

  static async getOne(serie, numero) {
    albaranIdSchema.parse({ serie, numero });

    const cleanSerie = serie.trim();

    const pool = await getConnection();

    const [headerResult, detailResult] = await Promise.all([
      pool
        .request()
        .input("SERIE", sql.VarChar, cleanSerie)
        .input("NUMERO", sql.Int, numero)
        .query(cQuerys.getAlbaranVenta),
      pool
        .request()
        .input("SERIE", sql.VarChar, cleanSerie)
        .input("NUMERO", sql.Int, numero)
        .query(cQuerys.getAlbaranVentaDetalle),
    ]);

    const albaran = headerResult.recordset[0];

    if (!albaran) return null;

    return {
      ...albaran,
      detalles: detailResult.recordset,
    };
  }

  /**
   * Auxiliar, obtiene solo los detalles
   * @param {string} serie
   * @param {number} numero
   */

  static async getDetail(serie, numero) {
    albaranIdSchema.parse({ serie, numero });

    const pool = await getConnection();

    const detailResult = await pool
      .request()
      .input("SERIE", sql.VarChar, serie)
      .input("NUMERO", sql.Int, numero)
      .query(cQuerys.getAlbaranVentaDetalle);

    return detailResult.recordset;
  }
}
