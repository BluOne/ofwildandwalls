import type { Camera } from "../types/site";

// the bottom-bar Camera menu
const cameras: Camera[] = [
  {
    brand: "Sony",
    models: [
      { name: "Sony α1", count: 12 },
      { name: "Sony a7 V", count: 15 }
    ]
  },
  {
    brand: "Canon",
    models: [{ name: "Model Name", count: 20 }]
  },
  {
    brand: "Nikon",
    models: [{ name: "Nikon", count: 20 }]
  }
];

export default cameras;
