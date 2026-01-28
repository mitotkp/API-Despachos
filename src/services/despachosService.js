import { success, z } from "zod";
import { getConnection, sql } from "../config/db.js";
import { cQuerys } from "../querys/querys.js";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
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


}
