//@ts-check
import { z } from "zod";
import { getConnection, sql } from "../config/db.js";
import { cQuerys } from "../querys/querys.js";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

const clienteIdSchema = z.object({
  codCliente: z.coerce.number().int().positive(),
});

export class cClientesService {
  /**
   * Obtiene lista páginada de clientes
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
        .query(cQuerys.getClientes),
      pool.request().query(cQuerys.getCountClientes),
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
   * Obtiene un cliente por su codigo
   * @param {number} codCliente
   */

  static async getOne(codCliente) {
    clienteIdSchema.parse({ codCliente });

    const pool = await getConnection();

    const result = await pool
      .request()
      .input("CODCLIENTE", sql.Int, codCliente)
      .query(cQuerys.getCliente);

    return result.recordset[0];
  }
}
