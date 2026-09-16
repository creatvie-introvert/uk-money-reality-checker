import { classificationLabels } from "@/product/calculator/copy";
import type { Classification } from "@/product/calculator/contracts";

export const classifications: readonly { id: Classification; label: string; meaning: string }[] = [
  { id: "OBSERVED_DATA", label: classificationLabels.OBSERVED_DATA, meaning: "A published observation for its stated source scope. It is not necessarily a personal household amount." },
  { id: "CALCULATED", label: classificationLabels.CALCULATED, meaning: "A value derived from supported inputs, which can include official evidence. An annual-to-monthly equivalent is calculated." },
  { id: "MODELLED_ESTIMATE", label: classificationLabels.MODELLED_ESTIMATE, meaning: "A value based on modelling assumptions. This label does not mean an estimate is available: development-only models are excluded from the current public calculator." },
  { id: "USER_ENTERED", label: classificationLabels.USER_ENTERED, meaning: "An amount you supplied. It may represent your household more closely than a published aggregate." },
];
