//@ts-check
import { Router } from "express";
import { cAlbaranController } from "../controllers/albaranController.js";

export const albaranRoutes = Router();

//1. Obtiene lista páginada de albaranes
//GET /api/albaranes?page=1&limit=10
albaranRoutes.get("/", cAlbaranController.listar);

//2. Obtiene un albaran por su serie y numero
//GET /api/albaranes/alDetail?serie=serie&numero=numero
albaranRoutes.get("/alDetail", cAlbaranController.obtenerUna);

//3. Obtiene solo los detalles de un albaran
//GET /api/albaranes/alDetailOnly?serie=serie&numero=numero
albaranRoutes.get("/alDetailOnly", cAlbaranController.verSoloDetalles);
