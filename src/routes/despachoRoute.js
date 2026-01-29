import { Router } from "express";
import { cDespachoController } from "../controllers/despachoController.js";

export const despachoRoutes = Router();

//1. Obtiene todos los despachos
//GET /api/despachos?page=1&limit=10
despachoRoutes.get("/", cDespachoController.listar);

//2. Obtiene un despacho completo
//GET /api/despachos/despDetail?numDespacho=numDespacho
despachoRoutes.get("/despDetail", cDespachoController.getDespachoCompleto);

//3. Procesa las inserciones de despachos 
//POST /api/despachos/subirDespachos
despachoRoutes.post("/subirDespachos", cDespachoController.crear);