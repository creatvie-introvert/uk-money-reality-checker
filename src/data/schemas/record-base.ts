import { z } from "zod";
import { confidenceClassSchema, releaseStatusSchema } from "./enums";
import { provenanceSchema } from "../provenance/model";
export const recordBase = {
  recordId: z.string().min(1),
  dataset: z.string().min(1),
  valueType: confidenceClassSchema,
  releaseStatus: releaseStatusSchema,
  provenance: provenanceSchema,
  methodology: z.string().min(1).optional(),
  qa: z.record(z.string(), z.unknown()).default({}),
};

