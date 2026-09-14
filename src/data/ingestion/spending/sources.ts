import defra from "../../controlled/spending/defra-fye2024.json";
import ons from "../../controlled/spending/ons-fye2025.json";
export const spendingExtracts = { defra, ons };
export type SpendingFamily = keyof typeof spendingExtracts;
