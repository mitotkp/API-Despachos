import { z } from "zod";

export const searchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),

    serie: z.string().optional(),
    numero: z.coerce.number().int().optional(),
    codCliente: z.coerce.number().int().optional(),

    fechaDesde: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
    fechaHasta: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),

    termino: z.string().optional()
})