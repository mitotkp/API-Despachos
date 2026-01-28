import { Router } from "express";
import { cDespachoController } from "../controllers/despachoController.js";

export const despachoRoutes = Router();

//1. Obtiene un despacho completo
//GET /api/despachos/despDetail?numDespacho=numDespacho
despachoRoutes.get("/despDetail", cDespachoController.getDespachoCompleto);

//2. Procesa las inserciones de despachos 
//POST /api/despachos/subirDespachos
despachoRoutes.post("/subirDespachos", cDespachoController.crear);