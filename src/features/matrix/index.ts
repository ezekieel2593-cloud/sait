// Feature facade for deterministic 22-energy calculations and chakra derivations.
export {
  computeMatrix,
  energyLabel,
  arcanumName,
  reduce22,
} from "../../lib/matrix/engine";
export type {
  MatrixChart,
  MatrixInput,
  MatrixPoint,
} from "../../lib/matrix/engine";
export { computeChakras, chakrasToText } from "../../lib/matrix/chakras";
