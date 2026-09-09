import { z } from "zod";

export const releaseStatusSchema = z.enum([
  "RELEASE_READY",
  "DEV_ONLY",
  "BLOCKED_FROM_RELEASE",
  "REFERENCE_ONLY",
]);

export const confidenceClassSchema = z.enum([
  "OBSERVED_DATA",
  "CALCULATED",
  "MODELLED_ESTIMATE",
  "USER_ENTERED",
]);

export const artifactKindSchema = z.enum([
  "AUDIT",
  "DIRECT_EVIDENCE_RELEASE",
  "REFERENCE_ARTIFACT",
]);

export const mvpCityIdSchema = z.enum([
  "LOC-LON",
  "LOC-BIR",
  "LOC-MAN",
  "LOC-LEE",
  "LOC-LIV",
  "LOC-BRS",
  "LOC-EDI",
  "LOC-GLA",
]);

export const jurisdictionSchema = z.enum(["rUK", "Scotland"]);

export type ReleaseStatus = z.infer<typeof releaseStatusSchema>;
export type ConfidenceClass = z.infer<typeof confidenceClassSchema>;
export type ArtifactKind = z.infer<typeof artifactKindSchema>;
export type MvpCityId = z.infer<typeof mvpCityIdSchema>;
export type Jurisdiction = z.infer<typeof jurisdictionSchema>;