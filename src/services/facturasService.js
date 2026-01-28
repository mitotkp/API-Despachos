//@ts-check
import { z } from "zod";
import { getConnection, sql } from "../config/db.js";
import { cQuerys } from "../querys/querys.js";

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
}
