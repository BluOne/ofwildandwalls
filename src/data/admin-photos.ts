import type { AdminPhoto } from "../types/admin";

// In-memory store. Swap for your DB / JSON file when wiring it up.
// meta = ordered key/value pairs rendered in the details panel.
const photos: AdminPhoto[] = [
  {
    slug: "lake", src: "/img/lake.jpg", alt: "Backwater treeline", cap: "Palm Backwater",
    title: "Palm Backwater", ref: "HR.01 / 05", category: "Landscape", collection: "Kerala Backwaters",
    camera: "Canon R5", date: "2022-09-04", live: true,
    about: "", altNote: "", l: "26.5", t: "1.4", w: "10.3", h: "7.2", views: ["Flow", "Grid"],
    meta: [
      { key: "Camera", value: "Canon R5" },
      { key: "Lens", value: "24–70mm f/2.8" },
      { key: "Settings", value: "1/125 · f/11 · ISO 100" },
      { key: "Location", value: "Kerala" }
    ]
  },
  {
    slug: "eagle", src: "/img/eagle.jpg", alt: "Eagle on a stone", cap: "Perched Eagle",
    title: "Perched Eagle", ref: "HR.02 / 05", category: "Wildlife", collection: "Raptors",
    camera: "Canon R6", date: "2023-01-18", live: true,
    about: "", altNote: "", l: "63.7", t: "1.6", w: "10.3", h: "13.8", views: ["Grid"],
    meta: [
      { key: "Camera", value: "Canon R6" },
      { key: "Lens", value: "400mm f/4" },
      { key: "Settings", value: "1/1600 · f/5.6 · ISO 640" },
      { key: "Location", value: "Bharatpur" }
    ]
  },
  {
    slug: "tiger", src: "/img/tiger.jpg", alt: "Tiger walking", cap: "Morning Patrol",
    title: "Morning Patrol", ref: "HR.03 / 05", category: "Wildlife", collection: "Bandhavgarh",
    camera: "Canon R5", date: "2023-04-02", live: true,
    about: "", altNote: "", l: "1.5", t: "17.4", w: "22.8", h: "30.8", views: ["Flow", "Grid"],
    meta: [
      { key: "Camera", value: "Canon R5" },
      { key: "Lens", value: "100–500mm f/7.1" },
      { key: "Settings", value: "1/800 · f/7.1 · ISO 1250" },
      { key: "Location", value: "Bandhavgarh" }
    ]
  },
  {
    slug: "hornbill", src: "/img/hornbill.jpg", alt: "Hornbill at a nest", cap: "Nesting Hornbill",
    title: "Nesting Hornbill", ref: "HR.04 / 05", category: "Wildlife", collection: "Western Ghats",
    camera: "Nikon Z8", date: "2023-06-11", live: true,
    about: "", altNote: "", l: "38.9", t: "17.3", w: "10.3", h: "15.3", views: ["Grid"],
    meta: [
      { key: "Camera", value: "Nikon Z8" },
      { key: "Lens", value: "500mm f/5.6" },
      { key: "Location", value: "Valparai" }
    ]
  },
  {
    slug: "palace", src: "/img/palace.jpg", alt: "Palace interior", cap: "Palace Doorway",
    title: "Palace Doorway", ref: "HR.01 / 05", category: "Architecture", collection: "Rajasthan",
    camera: "Sony A7 IV", date: "2021-11-27", live: true,
    about: "", altNote: "", l: "51.4", t: "17.4", w: "22.6", h: "28.2", views: ["Flow", "Grid"],
    meta: [
      { key: "Camera", value: "Sony A7 IV" },
      { key: "Lens", value: "16–35mm f/2.8" },
      { key: "Location", value: "Udaipur" }
    ]
  },
  {
    slug: "owl", src: "/img/owl.jpg", alt: "Spotted owlet", cap: "Spotted Owlet",
    title: "Spotted Owlet", ref: "HR.02 / 05", category: "Wildlife", collection: "Western Ghats",
    camera: "Nikon Z8", date: "2023-06-14", live: true,
    about: "", altNote: "", l: "88.6", t: "17.3", w: "10.1", h: "13.8", views: ["Grid"],
    meta: [{ key: "Camera", value: "Nikon Z8" }, { key: "Location", value: "Valparai" }]
  },
  {
    slug: "bridge", src: "/img/bridge.jpg", alt: "Brooklyn Bridge", cap: "Bridge Traffic",
    title: "Bridge Traffic", ref: "HR.03 / 05", category: "Architecture", collection: "New York",
    camera: "Sony A7 IV", date: "2024-02-09", live: false,
    about: "", altNote: "", l: "76.2", t: "33.1", w: "10.1", h: "13.7", views: ["Grid"],
    meta: [{ key: "Camera", value: "Sony A7 IV" }, { key: "Location", value: "New York" }]
  },
  {
    slug: "woodpecker", src: "/img/woodpecker.jpg", alt: "Woodpecker on a branch", cap: "Woodpecker Perch",
    title: "Woodpecker Perch", ref: "HR.04 / 05", category: "Wildlife", collection: "Western Ghats",
    camera: "Nikon Z8", date: "2023-06-15", live: true,
    about: "", altNote: "", l: "14.1", t: "49.6", w: "10.2", h: "6.7", views: ["Grid"],
    meta: [{ key: "Camera", value: "Nikon Z8" }]
  },
  {
    slug: "river", src: "/img/river.jpg", alt: "River rocks", cap: "River Rocks",
    title: "River Rocks", ref: "HR.01 / 05", category: "Landscape", collection: "Spiti",
    camera: "Canon R5", date: "2022-09-06", live: true,
    about: "", altNote: "", l: "26.5", t: "48.6", w: "22.6", h: "21.5", views: ["Flow", "Grid"],
    meta: [{ key: "Camera", value: "Canon R5" }, { key: "Location", value: "Spiti" }]
  },
  {
    slug: "tigerclose", src: "/img/tigerclose.jpg", alt: "Tiger, close", cap: "Close Encounter",
    title: "Close Encounter", ref: "HR.02 / 05", category: "Wildlife", collection: "Bandhavgarh",
    camera: "Canon R5", date: "2023-04-03", live: true,
    about: "", altNote: "", l: "76.2", t: "48.6", w: "22.7", h: "21.5", views: ["Grid"],
    meta: [{ key: "Camera", value: "Canon R5" }, { key: "Location", value: "Bandhavgarh" }]
  }
];

export default photos;
