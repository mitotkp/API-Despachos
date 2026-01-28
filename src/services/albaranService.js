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

    let query = cQuerys.auxSearchAv;

    if (filters.serie) {
      query += ` AND AVC.NUMSERIE = @SERIE`;
      request.input("SERIE", sql.VarChar, filters.serie);
    }

    if (filters.numero) {
      query += ` AND AVC.NUMALBARAN = @NUMERO`;
      request.input("NUMERO", sql.Int, filters.numero);
    }

    if (filters.codCliente) {
      query += ` AND AVC.CODCLIENTE = @CODCLIENTE`;
      request.input("CODCLIENTE", sql.Int, filters.codCliente);
    }

    if (filters.fechaDesde) {
      query += ` AND AVC.FECHA >= @FECHADESDE`;
      request.input("FECHADESDE", sql.Date, filters.fechaDesde);
    }

    if (filters.fechaHasta) {
      query += ` AND AVC.FECHA <= @FECHAHASTA`;
      request.input("FECHAHASTA", sql.Date, filters.fechaHasta);
    }

    if (filters.termino) {
      query += ` AND (C.NOMBRECLIENTE LIKE '%' + @TERMINO + '%' OR C.NIF20 LIKE '%' + @TERMINO + '%') `;
      request.input("TERMINO", sql.VarChar, `%${filters.termino}%`);
    }

    const offset = (filters.page - 1) * filters.limit;

    query += ` ORDER BY AVC.NUMSERIE DESC, AVC.NUMALBARAN DESC
                OFFSET @OFFSET ROWS FETCH NEXT @LIMIT ROWS ONLY`;

    request.input("OFFSET", sql.Int, offset);
    request.input("LIMIT", sql.Int, filters.limit);

    const result = await request.query(query);

    return result.recordset;
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
