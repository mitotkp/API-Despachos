import { z } from "zod";

export const buscadorDespachosSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),

    // Filtros de Cabecera
    ruta: z.string().optional(),
    transportista: z.string().optional(),
    estado: z.string().optional(), // 'S' o 'N'

    // Filtros de Contenido (Para buscar "¿Dónde está mi factura?")
    codCliente: z.coerce.number().int().optional(),
    numDoc: z.string().optional(), // Buscar por número de factura/pedido

    // Fechas
    fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

    // Búsqueda General (Placa, Chofer, ID Despacho)
    termino: z.string().optional()
});