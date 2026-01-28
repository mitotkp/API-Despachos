//@ts-check
import { Router } from "express";
import { cFacturaController } from "../controllers/facturaController.js";

export const facturasRoutes = Router();

//1.Obtiene la lista páginada de facturas
//GET /api/facturas?page=1&limit=10
facturasRoutes.get("/", cFacturaController.listar);

//2.Obtiene una factura por su serie y numero
//GET /api/facturas/facDetail?serie=serie&numero=numero
facturasRoutes.get("/facDetail", cFacturaController.obtenerUna);

//3.Obtiene solo los detalles de una factura
//GET /api/facturas/facDetailOnly?serie=serie&numero=numero
facturasRoutes.get("/facDetailOnly", cFacturaController.verSoloDetalles);
