export interface SitePhoto {
  slug: string;
  src: string;
  alt: string;
  cap: string;
  l: number;
  t: number;
  w: number;
  h: number;
}

export interface CameraModel {
  name: string;
  count: number;
}

export interface Camera {
  brand: string;
  models: CameraModel[];
}

export interface PhotoDetail {
  kicker: string;
  title: string;
  ref: string;
  about: string;
  altNote: string;
  collection: string;
  collectionHref: string;
  camera: string;
  lens: string;
  date: string;
  location: string;
  category: string;
  settings: string;
}

export type PhotoDetails = Record<string, PhotoDetail>;
