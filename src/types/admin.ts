export interface MetaItem {
  key: string;
  value: string;
}

export interface AdminPhoto {
  slug: string;
  src: string;
  alt: string;
  cap: string;
  title: string;
  ref: string;
  category_id?: number | null;
  collection_id?: number | null;
  camera_id?: number | null;
  lens_id?: number | null;
  country_id?: number | null;
  state?: string;
  category: string;
  collection: string;
  camera: string;
  lens?: string;
  date: string;
  live: boolean;
  about: string;
  altNote: string;
  l: string;
  t: string;
  w: string;
  h: string;
  views: string[];
  meta: MetaItem[];
}

export interface Category {
  title: string;
  parent: string;
  description: string;
}
