// Feature facade: UI/API can depend on this stable boundary instead of engine internals.
export { computeNatalChart } from "../../lib/astronomy/engine";
export type { NatalChart } from "../../lib/astronomy/engine";
export {
  computeTransits,
  computeProgressions,
  computeSolarReturn,
  computeSynastry,
} from "../../lib/astronomy/forecast";
export type { TimeAccuracy } from "../../lib/types";
