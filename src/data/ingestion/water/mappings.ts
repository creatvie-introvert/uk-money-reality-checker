import type { MvpCityId } from "../../schemas/enums";

export interface WaterCityMapping {
  cityId: MvpCityId;
  city: string;
  providers: { clean_water: string; wastewater: string };
  supportedRegime: "metered_volumetric" | "council_tax_band";
  requiredRecordIds: string[];
  applicability: "SUPPORTED_CONDITIONAL_PATH" | "UNRESOLVED";
  conditions: string[];
}
const ids = (source: string, rows: string[]) => rows.map((row) => `${source}:${row}:2026-27`);
const metered = ["water-standing", "water-volume", "sewer-standing", "sewer-volume"];
const scottishIds = ids("SRC-010", [..."ABCDEFGH"].flatMap((band) => ["clean_water", "wastewater", "combined"].map((service) => `${band}-${service}`)));
const mapping = (cityId: MvpCityId, city: string, provider: string, requiredRecordIds: string[], conditions: string[], wastewater = provider): WaterCityMapping => ({
  cityId, city, providers: { clean_water: provider, wastewater }, supportedRegime: provider === "scottish-water" ? "council_tax_band" : "metered_volumetric",
  requiredRecordIds, applicability: cityId === "LOC-BIR" ? "UNRESOLVED" : "SUPPORTED_CONDITIONAL_PATH", conditions,
});
/** Locked consumer mappings are not proof of every address's provider/tariff. */
export const waterCityMappings: readonly WaterCityMapping[] = [
  mapping("LOC-LON", "London", "thames-water", ids("SRC-014", ["water-standing", "water-volume", "sewer-standing-full", "sewer-standing-abated", "sewer-volume"]), ["Confirm both providers, standard single-household metered tariff and full/abated drainage option; bulk, SmartSaver and social tariffs excluded."]),
  mapping("LOC-BIR", "Birmingham", "severn-trent", ids("SRC-SEVERN-TRENT", [...metered, "highway-standing"]), ["Charging zone and surface drainage basis unresolved; source existence does not approve a Birmingham tariff path."]),
  mapping("LOC-MAN", "Manchester", "united-utilities", ids("SRC-015", [...metered, "surface-standing", "highway-standing"]), ["Confirm both providers, standard metered tariff and surface/highway drainage liability; optional discount not applied."]),
  mapping("LOC-LEE", "Leeds", "yorkshire-water", ids("SRC-017", [...metered, "surface-standing", "highway-volume"]), ["Confirm both providers, standard Yorkshire tariff outside York Waterworks, metering and surface drainage liability."]),
  mapping("LOC-LIV", "Liverpool", "united-utilities", ids("SRC-015", [...metered, "surface-standing", "highway-standing"]), ["Confirm both providers, standard metered tariff and surface/highway drainage liability; optional discount not applied."]),
  mapping("LOC-BRS", "Bristol", "bristol-water", [...ids("SRC-BRISTOL-WATER", ["water-standing", "water-volume"]), ...ids("SRC-018", ["sewer-standing-full", "sewer-standing-reduced", "sewer-volume"])], ["Confirm Bristol Water clean supply area, standard domestic metered tariff (not seasonal trial), Wessex wastewater service and full/reduced drainage option.", "Bristol Water brand is the South West Water regulated Bristol area. RV/assessed clean-water facts do not establish corresponding wastewater paths."], "wessex-water"),
  mapping("LOC-EDI", "Edinburgh", "scottish-water", scottishIds, ["Unmetered household connected to public water/sewerage; select actual council tax band A–H and applicable discounts separately. Metered regime excluded."]),
  mapping("LOC-GLA", "Glasgow", "scottish-water", scottishIds, ["Unmetered household connected to public water/sewerage; select actual council tax band A–H and applicable discounts separately. Metered regime excluded."]),
];
