import { z } from "zod";

import { mvpCityIdSchema } from "./enums";

export const geographyReferenceSchema = z.object({
  geographyType: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  sourceId: z.string().min(1),
});

export const geographySchema = z.object({
  mvpCityId: mvpCityIdSchema.optional(),
  consumerLabel: z.string().min(1).optional(),
  official: geographyReferenceSchema,
  providerArea: geographyReferenceSchema.optional(),
  zoneOrArea: z.string().min(1).optional(),
});

export type Geography = z.infer<typeof geographySchema>;