// @ts-check
import { createServer } from "node:http";
import { getConnection } from "./config/db.js";
import express from "express";
import cors from "cors";
import { facturasRoutes } from "./routes/facturasRoutes.js";
import { albaranRoutes } from "./routes/albaranRoutes.js";
import { clienteRoutes } from "./routes/clienteRoutes.js";
import { despachoRoutes } from "./routes/despachoRoute.js";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.disable("x-powered-by");

//RUTAS
app.use("/api/facturas", facturasRoutes);
app.use("/api/albaranes", albaranRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/despachos", despachoRoutes);

//Health Check
app.get("/api/test", async (req, res) => {
  try {
    const pool = await getConnection();
    res.json({
      status: "ok",
      db: pool.connected ? "connected" : "disconnected",
      message: "API de Despachos Drogueria, funcionando correctamente...",
      uptime: process.uptime,
      version: "1.0.0",
    });
  } catch (error) {
    res.status(500).json({ status: "DOWN", error: error.message });
  }
});

//Manejo del 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

const startServer = async () => {
  try {
    await getConnection();

    app.listen(PORT, () => {
      console.log(`
      Servidor listo en http://localhost:${PORT}
      DOCUMENTACIÓN:
      - GET  /api/facturas
      - GET  /api/facturas/facDetail?serie=serie&numero=numero
      - GET  /api/facturas/facDetailOnly?serie=serie&numero=numero
      - GET  /health  
      - GET  /api/albaranes
      - GET  /api/albaranes/alDetail?serie=serie&numero=numero
      - GET  /api/albaranes/alDetailOnly?serie=serie&numero=numero
      - GET  /api/clientes
      - GET  /api/clientes/cliente?codCliente=codCliente
      - GET /api/despachos
      - GET /api/despachos/despacho?numDespacho=numDespacho
      - POST /api/despachos/procesarDespachos
      `);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

startServer();
