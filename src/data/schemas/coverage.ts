import { z } from "zod";

import { artifactKindSchema, mvpCityIdSchema } from "./enums";

export const coverageRequirementSchema = z.object({
  category: z.string().min(1),
  artifactKind: artifactKindSchema,
  requiredCityIds: z.array(mvpCityIdSchema).default([]),
  requiredDimensions: z.array(z.string().min(1)).default([]),
  requiredReference: z.string().min(1).optional(),
});

export type CoverageRequirement = z.infer<typeof coverageRequirementSchema>;