import { z } from "zod";

/** User-locked architecture assumptions, not operator evidence or calculated fares. */
export const transportUsageProfileSchema = z.strictObject({
  profileId: z.string().min(1), valueType: z.literal("MODELLED_ESTIMATE"), releaseStatus: z.literal("DEV_ONLY"),
  daysPerWeek: z.union([z.literal(1.5), z.literal(3), z.literal(5), z.literal(6.5)]),
  assumptionSource: z.literal("UKMR user-locked Slice 9 travel-frequency profiles"),
});
export const transportUsageProfiles = [1.5, 3, 5, 6.5].map((daysPerWeek) => transportUsageProfileSchema.parse({
  profileId: `transport-days-per-week-${daysPerWeek}`, daysPerWeek, valueType: "MODELLED_ESTIMATE", releaseStatus: "DEV_ONLY",
  assumptionSource: "UKMR user-locked Slice 9 travel-frequency profiles",
}));
