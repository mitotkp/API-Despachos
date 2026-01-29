import { z } from "zod";
import { getConnection, sql } from "../config/db.js";
import { cQuerys } from "../querys/querys.js";
import { buscadorDespachosSchema } from "../schemas/buscarDespachoSchema.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const despachoSchema = z.object({
  numDespacho: z.string().min(1),
  ruta: z.string().min(1),
  transportista: z.string().min(1),
  nif20: z.string().min(1),
  unidad: z.string().min(1),
  placa1: z.string().min(1),
  trasbordo: z.string().min(1),
  placa2: z.string().min(1),
  despachado: z.string().min(1),
  rutero: z.string().min(1),
  documentos: z.array(z.object({
    serieDoc: z.string(),
    numDoc: z.coerce.string(),
    tipoDoc: z.string(),
    idPedido: z.string(),
    codCliente: z.number().int()
  })).min(1)
});

const despachosArraySchema = z.array(despachoSchema);

export class cDespachosService {

  static async getAll(params) {
    const { page = 1, limit = 10 } = paginationSchema.parse(params);
    const offset = (page - 1) * limit;

    const pool = await getConnection();

    const [dataResult, countResult] = await Promise.all([
      pool.request()
        .input("OFFSET", sql.Int, offset)
        .input("LIMIT", sql.Int, limit)
        .query(cQuerys.getDespachos),

      pool.request()
        .query(cQuerys.getCountDespachos)
    ]);

    const despachos = dataResult.recordset.map(row => {

      const { items, ITEMS, ...restoDatos } = row;

      const jsonString = item || ITEMS;

      return {
        ...restoDatos,
        items: jsonString ? JSON.parse(jsonString) : []
      };
    });

    const total = countResult.recordset[0].total;

    return {
      data: despachos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Procesa las inserciones de despachos 
   * @param {Array | Object } entrada
   */

  static async procesarDespachos(entrada) {

    const inputsArray = Array.isArray(entrada) ? entrada : [entrada];

    const dataValidada = despachosArraySchema.safeParse(inputsArray);

    if (!dataValidada.length === 0) return { procesados: 0 };

    const BATCH_SIZE = 500;
    let procesados = 0;

    const pool = await getConnection();

    console.time("Procesamiento Despachados");

    for (let i = 0; i < dataValidada.length; i += BATCH_SIZE) {
      const lote = dataValidada.slice(i, i + BATCH_SIZE);
      const jsonString = JSON.stringify(lote);

      try {
        await pool.request()
          .input("JsonData", sql.NVarChar(sql.MAX), jsonString)
          .query(cQuerys.insertarDespachosMasivo);

        procesados += lote.length;

        console.log(`Procesados ${procesados} de ${dataValidada.length}`);
      } catch (error) {
        console.error(`Error al procesar lote ${i} :`, error);
        throw new Error(`Error al procesar lote ${i} : ${error.message}`);
      }
    }

    console.timeEnd("Procesamiento Despachados");
    return {
      success: true,
      total: procesados,
      mode: dataValidada.length > 1 ? 'BULK' : 'SINGLE'
    }
  }

  /***
   * Obtiene un despacho completo 
   * @param {String} numDespacho 
   */

  static async getDespachoCompleto(numDespacho) {
    const pool = await getConnection();

    const result = await pool.request()
      .input("NUMDESPACHO", sql.NVarChar(50), numDespacho)
      .query(cQuerys.getDespachoCompleto);

    if (!result) return null;

    return {
      cabecera: result.recordset[0],
      detalle: result.recordset
    }
  }

  static async search(params) {
    const filters = buscadorDespachosSchema.parse(params);
    const pool = await getConnection();
    const request = pool.request();

    let query = `
      SELECT DISTINCT
        C.NUMDESPACHO, 
        C.RUTA, 
        C.TRANSPORTISTA, 
        C.NIF20, 
        C.UNIDAD, 
        C.PLACA1, 
        C.TRASBORDO, 
        C.PLACA2, 
        C.DESPACHADO, 
        C.RUTERO, 
        C.FECHADESPACHO,
        (
          SELECT 
            L.SERIEDOC, L.NUMDOC, L.TIPODOC, L.IDPEDIDO, L.CODCLIENTE
          FROM RIP.DESPACHOSLIN L
          WHERE L.NUMDESPACHO = C.NUMDESPACHO
          FOR JSON PATH
        ) AS items
      FROM 
        RIP.DESPACHOSCAB C
    `;

    const necesitaLineas = filters.codCliente || filters.numDoc;

    if (necesitaLineas) {
      query += " INNER JOIN RIP.DESPACHOSLIN L ON C.NUMDESPACHO = L.NUMDESPACHO ";
    }

    let whereClause = " WHERE 1=1 ";

    if (filters.ruta) {
      whereClause += " AND C.RUTA = @Ruta ";
      request.input("Ruta", sql.NVarChar, filters.ruta);
    }

    if (filters.transportista) {
      whereClause += " AND C.TRANSPORTISTA LIKE '%' + @Transportista + '%' ";
      request.input("Transportista", sql.NVarChar, filters.transportista);
    }

    if (filters.estado) {
      whereClause += " AND C.DESPACHADO = @Estado ";
      request.input("Estado", sql.VarChar, filters.estado);
    }

    if (filters.fechaDesde) {
      whereClause += " AND C.FECHADESPACHO >= @FechaDesde ";
      request.input("FechaDesde", sql.VarChar, filters.fechaDesde);
    }

    if (filters.fechaHasta) {
      whereClause += " AND C.FECHADESPACHO <= @FechaHasta ";
      request.input("FechaHasta", sql.VarChar, filters.fechaHasta + ' 23:59:59');
    }

    if (filters.codCliente) {
      whereClause += " AND L.CODCLIENTE = @CodCliente ";
      request.input("CodCliente", sql.Int, filters.codCliente);
    }

    if (filters.numDoc) {
      whereClause += " AND (L.NUMDOC = @NumDoc OR L.IDPEDIDO = @NumDoc) ";
      request.input("NumDoc", sql.NVarChar, filters.numDoc);
    }

    if (filters.termino) {
      whereClause += ` AND (
        C.NUMDESPACHO LIKE '%' + @Termino + '%' OR 
        C.PLACA1 LIKE '%' + @Termino + '%' OR
        C.TRANSPORTISTA LIKE '%' + @Termino + '%'
      ) `;
      request.input("Termino", sql.NVarChar, filters.termino);
    }

    const offset = (filters.page - 1) * filters.limit;
    request.input("Offset", sql.Int, offset);
    request.input("Limit", sql.Int, filters.limit);

    const finalQuery = `
      ${query}
      ${whereClause}
      ORDER BY C.FECHADESPACHO DESC, C.NUMDESPACHO DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT C.NUMDESPACHO) as total 
      FROM RIP.DESPACHOSCAB C
      ${necesitaLineas ? 'INNER JOIN RIP.DESPACHOSLIN L ON C.NUMDESPACHO = L.NUMDESPACHO' : ''}
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      request.query(finalQuery),
      request.query(countQuery)
    ]);

    const despachos = dataResult.recordset.map(row => {
      const { items, ITEMS, ...restoDatos } = row;
      const jsonStr = items || ITEMS;
      return {
        ...restoDatos,
        items: jsonStr ? JSON.parse(jsonStr) : []
      };
    });

    const total = countResult.recordset[0].total;

    return {
      data: despachos,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      }
    }
  }


}
