import { cFacturasService } from "../services/facturasService.js";
import { z } from "zod";

export class cFacturaController {
  static async listar(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const resultado = await cFacturasService.getAll({ page, limit });
      res.status(200).json(resultado);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }

  static async obtenerUna(req, res) {
    try {
      const { serie, numero } = req.query;

      console.log(serie, numero);

      const factura = await cFacturasService.getOne(serie, numero);

      //console.log(factura);

      if (!factura) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }

      res.json(factura);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Error de validacion", error: error.errors });
      }

      res.status(500).json({ error: error.message });
    }
  }

  static async verSoloDetalles(req, res) {
    try {
      const { serie, numero } = req.query;

      const factura = await cFacturasService.getDetail(serie, numero);

      //console.log(factura);

      if (!factura) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }

      res.json(factura);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Error de validacion", error: error.errors });
      }

      res.status(500).json({ error: error.message });
    }
  }
}
