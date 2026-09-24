import type { Category } from "../types/admin";

// title / parent / description — parent "None" means top level.
const categories: Category[] = [
  { title: "Wildlife", parent: "None", description: "Everything with a heartbeat, shot on long glass." },
  { title: "Raptors", parent: "Wildlife", description: "Eagles, owls and kites." },
  { title: "Landscape", parent: "None", description: "Wide country, mostly at altitude." },
  { title: "Architecture", parent: "None", description: "Built form, interiors and street geometry." }
];

export default categories;
