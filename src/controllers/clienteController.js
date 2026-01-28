import { cClientesService } from "../services/clientesService.js";
import { z } from "zod";

export class cClientesController {
  static async listar(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const resultado = await cClientesService.getAll({ page, limit });
      res.status(200).json(resultado);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Error de validacion", error: error.errors });
      }
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }

  static async obtenerUno(req, res) {
    try {
      const { codCliente } = req.query;

      console.log(codCliente);

      const cliente = await cClientesService.getOne(codCliente);

      if (!cliente) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json(cliente);
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
