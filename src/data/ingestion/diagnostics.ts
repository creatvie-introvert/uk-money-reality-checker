import { z } from "zod";

export const ingestionDiagnosticCodeSchema = z.enum([
  "SOURCE_PARSE_FAILURE",
  "MISSING_REQUIRED_SOURCE_FIELD",
  "UNSUPPORTED_SOURCE_VALUE",
  "DUPLICATE_SOURCE_IDENTIFIER",
  "INVALID_DATE",
  "INVALID_NUMERIC_VALUE",
  "GEOGRAPHY_MAPPING_FAILURE",
  "SOURCE_REVIEW_REQUIRED",
]);

export const ingestionDiagnosticSchema = z.object({
  code: ingestionDiagnosticCodeSchema,
  message: z.string().min(1),
  rowIndex: z.number().int().nonnegative().optional(),
  field: z.string().optional(),
});

export type IngestionDiagnostic = z.infer<typeof ingestionDiagnosticSchema>;
