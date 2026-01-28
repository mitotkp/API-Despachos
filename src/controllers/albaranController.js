import { cAlbaranService } from "../services/albaranService.js";
import { z } from "zod";

export class cAlbaranController {
  static async listar(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const resultado = await cAlbaranService.getAll({ page, limit });
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

      const albaran = await cAlbaranService.getOne(serie, numero);

      if (!albaran) {
        return res.status(404).json({ error: "Albaran no encontrado" });
      }

      res.json(albaran);
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

      const albaran = await cAlbaranService.getDetail(serie, numero);

      if (!albaran) {
        return res.status(404).json({ error: "Albaran no encontrado" });
      }

      res.json(albaran);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Error de validacion", error: error.errors });
      }

      res.status(500).json({ error: error.message });
    }
  }

  static async search(req, res) {
    try {
      const resultados = await cAlbaranService.search(req.query);
      res.json(resultados);
    } catch (error) {
      if (error.name === 'ZodError') return res.status(400).json(error.errors);
      res.status(500).json({ error: error.message });
    }
  }
}
