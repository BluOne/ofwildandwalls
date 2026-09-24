import type { SitePhoto } from "../types/site";

// slug is used for the /photo/:slug route, cap = 2-3 word hover caption,
// l/t/w/h = flow-view position in vw
const photos: SitePhoto[] = [
  { slug: "lake", src: "/img/lake.jpg", alt: "Backwater treeline", cap: "Palm Backwater", l: 26.49, t: 1.38, w: 10.34, h: 7.24 },
  { slug: "eagle", src: "/img/eagle.jpg", alt: "Eagle on a stone", cap: "Perched Eagle", l: 63.74, t: 1.59, w: 10.34, h: 13.78 },
  { slug: "tiger", src: "/img/tiger.jpg", alt: "Tiger walking", cap: "Morning Patrol", l: 1.51, t: 17.44, w: 22.83, h: 30.79 },
  { slug: "hornbill", src: "/img/hornbill.jpg", alt: "Hornbill at a nest", cap: "Nesting Hornbill", l: 38.89, t: 17.27, w: 10.25, h: 15.29 },
  { slug: "palace", src: "/img/palace.jpg", alt: "Palace interior", cap: "Palace Doorway", l: 51.38, t: 17.36, w: 22.61, h: 28.21 },
  { slug: "owl", src: "/img/owl.jpg", alt: "Spotted owlet", cap: "Spotted Owlet", l: 88.63, t: 17.27, w: 10.08, h: 13.78 },
  { slug: "bridge", src: "/img/bridge.jpg", alt: "Brooklyn Bridge", cap: "Bridge Traffic", l: 76.23, t: 33.12, w: 10.12, h: 13.7 },
  { slug: "woodpecker", src: "/img/woodpecker.jpg", alt: "Woodpecker on a branch", cap: "Woodpecker Perch", l: 14.08, t: 49.57, w: 10.21, h: 6.68 },
  { slug: "river", src: "/img/river.jpg", alt: "River rocks", cap: "River Rocks", l: 26.49, t: 48.62, w: 22.61, h: 21.53 },
  { slug: "tigerclose", src: "/img/tigerclose.jpg", alt: "Tiger, close", cap: "Close Encounter", l: 76.23, t: 48.62, w: 22.74, h: 21.53 }
];

export default photos;
