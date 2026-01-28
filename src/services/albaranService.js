import { z } from "zod";
import { getConnection, sql } from "../config/db.js";
import { cQuerys } from "../querys/querys.js";

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
