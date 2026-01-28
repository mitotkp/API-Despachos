//@ts-check
import { Router } from "express";
import { cClientesController } from "../controllers/clienteController.js";

export const clienteRoutes = Router();

//1. Obtiene lista páginada de clientes
//GET /api/clientes?page=1&limit=10
clienteRoutes.get("/", cClientesController.listar);

//2. Obtiene un cliente por su codigo
//GET /api/clientes/cliente?codCliente=codCliente
clienteRoutes.get("/cliente", cClientesController.obtenerUno);
