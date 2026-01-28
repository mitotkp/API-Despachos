//@ts-check
import { z } from "zod";
import { getConnection, sql } from "../config/db.js";
import { cQuerys } from "../querys/querys.js";
import { searchSchema } from "../schemas/searchSchemas.js";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

const facturaIdSchema = z.object({
  serie: z.string().min(1),
  numero: z.coerce.number().int().positive(),
});

export class cFacturasService {
  /**
   * Obtiene lista páginada de facturas
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
        .query(cQuerys.getFacturasVentas),
      pool.request().query(cQuerys.getCountFacturasVentas),
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
   * Obtiene factura y sus detalles
   * @param {string} serie
   * @param {number} numero
   */
  static async getOne(serie, numero) {
    facturaIdSchema.parse({ serie, numero });

    //console.log("Esto es getOne", serie, numero);
    const cleanSerie = serie.trim();

    const pool = await getConnection();

    const [headerResult, detailResult] = await Promise.all([
      pool
        .request()
        .input("SERIE", sql.VarChar, cleanSerie)
        .input("NUMERO", sql.Int, numero)
        .query(cQuerys.getFacturaVenta),

      pool
        .request()
        .input("SERIE", sql.VarChar, cleanSerie)
        .input("NUMERO", sql.Int, numero)
        .query(cQuerys.getFacturaVentaDetalle),
    ]);

    const factura = headerResult.recordset[0];

    //console.log("Esto es factura", factura);

    if (!factura) return null;

    return {
      ...factura,
      detalles: detailResult.recordset,
    };
  }

  /**
   * Auxiliar, obtiene solo los detalles
   * @param {string} serie
   * @param {number} numero
   */

  static async getDetail(serie, numero) {
    facturaIdSchema.parse({ serie, numero });

    const pool = await getConnection();

    const detailResult = await pool
      .request()
      .input("SERIE", sql.VarChar, serie)
      .input("NUMERO", sql.Int, numero)
      .query(cQuerys.getFacturaVentaDetalle);

    return detailResult.recordset;
  }

  /**
   * Búsqueda de facturas
   * @param {z.infer<typeof searchSchema>} params
   */

  static async search(params) {
    const filters = searchSchema.parse(params);
    const pool = await getConnection();
    const request = pool.request();

    let whereClause = "WHERE FV.N = 'B'";

    if (filters.serie) {
      whereClause += ` AND FV.NUMSERIE = @SERIE`;
      request.input("SERIE", sql.VarChar, filters.serie);
    }

    if (filters.numero) {
      whereClause += ` AND FV.NUMFACTURA = @NUMERO`;
      request.input("NUMERO", sql.Int, filters.numero);
    }

    if (filters.codCliente) {
      whereClause += ` AND FV.CODCLIENTE = @CODCLIENTE`;
      request.input("CODCLIENTE", sql.Int, filters.codCliente);
    }

    if (filters.fechaDesde) {
      whereClause += ` AND FV.FECHA >= @FECHADESDE`;
      request.input("FECHADESDE", sql.Date, filters.fechaDesde);
    }

    if (filters.fechaHasta) {
      whereClause += ` AND FV.FECHA <= @FECHAHASTA`;
      request.input("FECHAHASTA", sql.Date, filters.fechaHasta);
    }

    if (filters.termino) {
      whereClause += " AND (C.NOMBRECLIENTE LIKE '%' + @TERMINO + '%' OR C.NIF20 LIKE '%' + @TERMINO + '%') ";
      request.input("TERMINO", sql.VarChar, `%${filters.termino}%`);
    }

    const offset = (filters.page - 1) * filters.limit;
    request.input("OFFSET", sql.Int, offset);
    request.input("LIMIT", sql.Int, filters.limit);


  }
}
