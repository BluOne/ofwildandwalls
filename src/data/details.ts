import type { PhotoDetails } from "../types/site";

const commonDetail = {
  kicker: "Landscape",
  title: "Ridgeline, Noon",
  ref: "HR.01 / 05",
  about: "Wind strong enough to need two hands on the tripod.",
  altNote: "The wind dropped for maybe four seconds. That's the frame.",
  collection: "A trek through Spiti tracing the line where rock stops arguing with sky.",
  collectionHref: "#",
  camera: "Canon R5",
  lens: "24–70mm f/2.8",
  date: "Sep 4, 2022",
  location: "Spiti, Himachal Pradesh",
  category: "Landscape",
  settings: "1/125 · f/11 · ISO 100"
};

// the details panel, keyed by photo slug
const details: PhotoDetails = {
  lake: { ...commonDetail },
  eagle: { ...commonDetail },
  tiger: { ...commonDetail },
  hornbill: { ...commonDetail },
  palace: { ...commonDetail },
  owl: { ...commonDetail },
  bridge: { ...commonDetail },
  woodpecker: { ...commonDetail },
  river: { ...commonDetail },
  tigerclose: { ...commonDetail }
};

export default details;
