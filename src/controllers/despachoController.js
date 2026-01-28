import { cDespachosService } from "../services/despachosService.js";
import { z } from "zod";

export class cDespachoController {

  static async crear(req, res) {
    try {
      const resultado = await cDespachosService.procesarDespachos(req.body);

      res.status(201).json({
        success: true,
        message: "Despachos procesados correctamente",
        data: resultado
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Datos inválidos",
          errors: error.errors
        });
      }

      if (error.message.includes('PRIMARY KEY')) {
        return res.status(409).json({ message: 'Uno de los despachos ya existe en la base de datos.' });
      }

      res.status(500).json({ message: error.message });

    }
  }

  /**
   * Obtiene un despacho completo
   * @param {string} numDespacho 
   */

  static async getDespachoCompleto(req, res) {
    try {
      const { numDespacho } = req.query;
      const resultado = await cDespachosService.getDespachoCompleto(numDespacho);
      res.status(200).json(resultado);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
