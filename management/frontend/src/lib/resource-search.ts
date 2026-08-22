import { z } from "zod";

export const resourceSearchSchema = z.object({
	skip: z.coerce.number().int().min(0).catch(0),
	limit: z.coerce.number().int().min(1).max(500).catch(20),
	q: z.string().optional().catch(undefined),
	status: z.string().optional().catch(undefined),
});
