import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import s3 from "../config/s3";
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { AdminPhoto, MetaItem } from "../types/admin";
import { IMMUTABLE_CACHE, s3KeyUrl, siteImageFields, tryCreateImageVariants, type ImageVariantInfo } from "../utils/imageVariants";

interface DBPhotoRow extends RowDataPacket {
  id: number;
  title: string;
  cap: string;
  slug: string;
  ref: string;
  url: string;
  s3_key: string;
  alt: string;
  category_id?: number | null;
  collection_id?: number | null;
  camera_id?: number | null;
  lens_id?: number | null;
  country_id?: number | null;
  state?: string;
  category?: string;
  collection?: string;
  camera?: string;
  lens?: string;
  date: string;
  description: string;
  alt_note?: string;
  tags?: string | null;
  species?: string | null;
  scientific_name?: string | null;
  drive_file_id?: string | null;
  l: string;
  t: string;
  w: string;
  h: string;
  live: number | boolean;
  metadata: any;
}

const slugify = (s: string): string =>
  String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// `base`, or `base-2`, `base-3`, ... — the first one no other photo uses.
// excludeId skips the photo being edited, so it can keep its own slug.
// slugify() only emits [a-z0-9-], so `base` is safe inside LIKE.
const uniqueSlug = async (base: string, excludeId: number | null = null): Promise<string> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT slug FROM photos WHERE (slug = ? OR slug LIKE ?) AND (? IS NULL OR id <> ?)",
    [base, `${base}-%`, excludeId, excludeId]
  );
  const taken = new Set(rows.map(r => String(r.slug)));

  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

// The slug the form sent, and whether it was filled in automatically from the
// caption (slug_auto). Only an automatic slug is de-duplicated; a hand-typed
// one that clashes is reported back to the form, so it never changes behind
// your back.
const slugFromBody = (req: Pick<Request, "body">): { slug: string; auto: boolean } => ({
  slug: slugify(req.body.slug || ""),
  auto: req.body.slug_auto === "1",
});

// "" when the form is valid, otherwise the message to show above it.
// Mirrors the `required` fields in photo-form.ejs.
const photoFormError = (req: Request, hasImage: boolean): string => {
  const title = String(req.body.title || "").trim();
  const missing: string[] = [];

  if (!title) missing.push("panel title");
  if (!slugify(req.body.slug || "")) missing.push("slug");
  if (!hasImage) missing.push("image");

  if (missing.length) return `Please fill in: ${missing.join(", ")}.`;
  return "";
};

const asArray = (v: unknown): string[] =>
  v === undefined ? [] : Array.isArray(v) ? (v as string[]) : [v as string];

const readMeta = (body: Request["body"]): MetaItem[] => {
  const metaItems: MetaItem[] = [];

  if (body.camera) metaItems.push({ key: "Camera", value: String(body.camera).trim() });
  if (body.lens) metaItems.push({ key: "Lens", value: String(body.lens).trim() });
  if (body.settings) metaItems.push({ key: "Settings", value: String(body.settings).trim() });
  if (body.location) metaItems.push({ key: "Location", value: String(body.location).trim() });

  return metaItems;
};

/** "Tiger,  wild , ,tiger" -> "Tiger, wild": trimmed, empties dropped, deduped case-insensitively. */
const normalizeTags = (raw: any): string => {
  const seen = new Set<string>();
  return String(raw || "")
    .split(",")
    .map(t => t.trim().replace(/\s+/g, " "))
    .filter(t => {
      const k = t.toLowerCase();
      if (!t || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(", ");
};

/** Ids from a repeated form field (string or array), deduped, in the order given. */
const parseIds = (raw: any): number[] => {
  const list = Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === "" ? [] : [raw];
  return [...new Set(list.map((v: any) => parseInt(v, 10)).filter((n: number) => Number.isInteger(n) && n > 0))];
};

const parseCollectionIds = (body: any): number[] => parseIds(body.collection_ids);

/** Category ids: the multi-select `category_ids`, or a single legacy `category_id`. */
const parseCategoryIds = (body: any): number[] =>
  body.category_ids !== undefined ? parseIds(body.category_ids) : parseIds(body.category_id);

/** Replaces a photo's categories. photos.category_id mirrors the first one for legacy readers. */
const savePhotoCategories = async (photoId: number, ids: number[]) => {
  await pool.query("DELETE FROM photo_categories WHERE photo_id = ?", [photoId]);
  if (ids.length) {
    await pool.query("INSERT IGNORE INTO photo_categories (photo_id, category_id) VALUES ?", [ids.map(id => [photoId, id])]);
  }
  await pool.query("UPDATE photos SET category_id = ? WHERE id = ?", [ids[0] ?? null, photoId]);
};

/** Replaces a photo's collections. photos.collection_id mirrors the first one for legacy readers. */
const savePhotoCollections = async (photoId: number, ids: number[]) => {
  await pool.query("DELETE FROM photo_collections WHERE photo_id = ?", [photoId]);
  if (ids.length) {
    await pool.query("INSERT IGNORE INTO photo_collections (photo_id, collection_id) VALUES ?", [ids.map(id => [photoId, id])]);
  }
  await pool.query("UPDATE photos SET collection_id = ? WHERE id = ?", [ids[0] ?? null, photoId]);
};

const blankPhoto = (): AdminPhoto => ({
  cap: "", slug: "", title: "", ref: "", category: "", collection: "", camera: "",
  category_id: null, collection_id: null, camera_id: null, lens_id: null, country_id: null, state: "",
  date: "", about: "", altNote: "", tags: "", species: "", scientificName: "", src: "", alt: "",
  l: "", t: "", w: "", h: "", live: true, views: ["Flow", "Grid"],
  meta: []
});

const photoFromBody = (req: Request): AdminPhoto & Record<string, any> => {
  const cap = String(req.body.cap || "").trim();
  return {
    cap,
    slug: slugify(req.body.slug || cap),
    title: (req.body.title || cap).trim(),
    ref: (req.body.ref || "").trim(),
    category: "",
    collection: "",
    camera: "",
    category_id: parseCategoryIds(req.body)[0] ?? null,
    category_ids: parseCategoryIds(req.body),
    species: String(req.body.species || "").trim(),
    scientificName: String(req.body.scientific_name || "").trim(),
    collection_id: parseCollectionIds(req.body)[0] ?? null,
    collection_ids: parseCollectionIds(req.body),
    tags: normalizeTags(req.body.tags),
    camera_id: req.body.camera_id ? parseInt(req.body.camera_id, 10) : null,
    lens_id: req.body.lens_id ? parseInt(req.body.lens_id, 10) : null,
    country_id: req.body.country_id ? parseInt(req.body.country_id, 10) : null,
    state: (req.body.state || "").trim(),
    location: (req.body.location || "").trim(),
    settings: (req.body.settings || "").trim(),
    date: (req.body.date || "").trim(),
    about: (req.body.about || "").trim(),
    altNote: (req.body.altNote || "").trim(),
    alt: (req.body.alt || "").trim(),
    src: req.body.src || "",
    l: req.body.l || "",
    t: req.body.t || "",
    w: req.body.w || "",
    h: req.body.h || "",
    live: req.body.live !== "draft",
    views: ["Flow", "Grid"],
    meta: []
  };
};

const mapDBPhotoToAdminPhoto = (row: DBPhotoRow, collectionDescriptions: Record<string, string> = {}): AdminPhoto & Record<string, any> => {
  let metaArr: MetaItem[] = [];
  if (row.metadata) {
    if (typeof row.metadata === "string") {
      try { metaArr = JSON.parse(row.metadata); } catch (e) {}
    } else if (Array.isArray(row.metadata)) {
      metaArr = row.metadata;
    } else if (typeof row.metadata === "object" && row.metadata !== null) {
      metaArr = Object.values(row.metadata);
    }
  }

  const metaMap: Record<string, string> = {};
  if (Array.isArray(metaArr)) {
    metaArr.forEach(m => {
      if (m && typeof m === "object") {
        const k = String((m as any).key || (m as any).name || "").trim();
        const v = String((m as any).value || "").trim();
        if (k) {
          metaMap[k] = v;
          metaMap[k.toLowerCase()] = v;
        }
      }
    });
  }

  const getMeta = (key: string): string => metaMap[key] || metaMap[key.toLowerCase()] || "";

  const s3Bucket = process.env.AWS_S3_BUCKET_NAME || "";
  const s3Region = process.env.AWS_REGION || "us-east-1";
  let photoSrc = row.url || "";
  if (!photoSrc && row.s3_key) {
    photoSrc = row.s3_key.startsWith("http")
      ? row.s3_key
      : `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${row.s3_key}`;
  }

  // Resized WebP copies (empty list for photos without variants yet).
  const img = siteImageFields(row as any, photoSrc);
  const variants = String((row as any).variant_base ? (row as any).variant_widths || "" : "")
    .split(",")
    .map((w) => parseInt(w, 10))
    .filter((w) => w > 0)
    .sort((a, b) => a - b)
    .map((w) => ({ width: w, url: s3KeyUrl(`${(row as any).variant_base}-${w}.webp`) }));

  const collectionName = row.collection || "";
  const aboutCollection = collectionDescriptions[collectionName] || "";

  return {
    cap: row.cap || row.title || "",
    slug: row.slug || "",
    title: row.title || row.cap || "",
    ref: row.ref || "",
    category_id: row.category_id || null,
    collection_id: row.collection_id || null,
    camera_id: row.camera_id || null,
    lens_id: row.lens_id || null,
    country_id: row.country_id || null,
    state: row.state || "",
    category: row.category || "",
    collection: collectionName,
    aboutCollection: aboutCollection,
    camera: row.camera || getMeta("Camera"),
    lens: row.lens || getMeta("Lens"),
    location: getMeta("Location"),
    settings: getMeta("Settings"),
    date: row.date || "",
    about: row.description || "",
    altNote: row.alt_note || "",
    tags: row.tags || "",
    species: row.species || "",
    scientificName: row.scientific_name || "",
    src: photoSrc,
    thumb: img.srcSmall,
    variants,
    alt: row.alt || "",
    l: row.l || "",
    t: row.t || "",
    w: row.w || "",
    h: row.h || "",
    live: Boolean(row.live),
    views: ["Flow", "Grid"],
    meta: metaArr
  };
};

const SELECT_ADMIN_PHOTOS = `
  SELECT 
    p.*,
    cat.name AS category,
    col.name AS collection,
    cam.model AS camera,
    l.model AS lens
  FROM photos p
  LEFT JOIN categories cat ON p.category_id = cat.id
  LEFT JOIN collections col ON p.collection_id = col.id
  LEFT JOIN cameras cam ON p.camera_id = cam.id
  LEFT JOIN lenses l ON p.lens_id = l.id
`;

const getPhotos = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limit = 15;
    const search = String(req.query.search || req.query.q || "").trim();

    const [photoRows] = await pool.query<DBPhotoRow[]>(`${SELECT_ADMIN_PHOTOS} ORDER BY p.id DESC`);
    const [catRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM categories ORDER BY id ASC");
    const [collRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title, description FROM collections ORDER BY id ASC");
    const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY id ASC");
    const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY id ASC");

    const collectionMap: Record<string, string> = {};
    collRows.forEach(c => { collectionMap[c.title] = c.description || ""; });

    let allPhotos = photoRows.map(r => mapDBPhotoToAdminPhoto(r, collectionMap));

    if (search) {
      const q = search.toLowerCase();
      allPhotos = allPhotos.filter(p =>
        p.cap.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q) ||
        p.camera.toLowerCase().includes(q) ||
        (p.lens || "").toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.date.toLowerCase().includes(q) ||
        p.about.toLowerCase().includes(q) ||
        (p.meta || []).some(m => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q))
      );
    }

    const totalItems = allPhotos.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const pagePhotos = allPhotos.slice(offset, offset + limit);

    res.render("photos", {
      nav: "photos",
      photos: pagePhotos,
      allPhotos: allPhotos,
      categories: catRows,
      collections: collRows,
      cameras: camRows,
      lenses: lensRows,
      search,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        limit,
        prevPage: currentPage > 1 ? currentPage - 1 : null,
        nextPage: currentPage < totalPages ? currentPage + 1 : null
      },
      flash: req.query.flash || "",
      error: req.query.error || ""
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    res.status(500).send("Error fetching photos");
  }
};

/**
 * Categories and collections offered in the Add/Edit photo form: only published
 * ones, plus any unpublished ones the photo already has (marked as such), so
 * editing a photo never drops them silently.
 */
const formChoices = async (keepCategoryIds: number[] = [], keepCollectionIds: number[] = []) => {
  const keep = (ids: number[]) => (ids.length ? ids : [0]);
  const [catRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name AS title, live FROM categories WHERE live = 1 OR id IN (?) ORDER BY id ASC",
    [keep(keepCategoryIds)]
  );
  const [collRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name AS title, description, live FROM collections WHERE live = 1 OR id IN (?) ORDER BY id ASC",
    [keep(keepCollectionIds)]
  );
  const mark = (r: RowDataPacket) => ({ ...r, title: r.live ? r.title : `${r.title} (unpublished)` });
  return { catRows: catRows.map(mark), collRows: collRows.map(mark), rawCollRows: collRows };
};

const getNewPhotoForm = async (req: Request, res: Response) => {
  try {
    const { catRows, collRows } = await formChoices();
    const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY id ASC");
    const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY id ASC");
    const [countryRows] = await pool.query<RowDataPacket[]>("SELECT id, country, state, city FROM countries ORDER BY country ASC, state ASC, city IS NOT NULL, city ASC");

    res.render("photo-form", {
      nav: "add",
      mode: "add",
      photo: blankPhoto(),
      categories: catRows,
      collections: collRows,
      cameras: camRows,
      lenses: lensRows,
      countries: countryRows
    });
  } catch (error) {
    console.error("Error rendering add photo form:", error);
    res.status(500).send("Error rendering add photo form");
  }
};

const getEditPhotoForm = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<DBPhotoRow[]>(`${SELECT_ADMIN_PHOTOS} WHERE p.slug = ?`, [req.params.slug]);
    if (rows.length === 0) {
      return res.status(404).send("Photo not found");
    }

    const [pcRows] = await pool.query<RowDataPacket[]>("SELECT collection_id FROM photo_collections WHERE photo_id = ?", [rows[0].id]);
    const [pcatRows] = await pool.query<RowDataPacket[]>("SELECT category_id FROM photo_categories WHERE photo_id = ?", [rows[0].id]);
    const collectionIds = pcRows.map(r => r.collection_id as number);
    const categoryIds = pcatRows.map(r => r.category_id as number);
    if (rows[0].category_id && !categoryIds.includes(rows[0].category_id)) categoryIds.push(rows[0].category_id);

    const { catRows, collRows, rawCollRows } = await formChoices(categoryIds, collectionIds);
    const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY id ASC");
    const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY id ASC");
    const [countryRows] = await pool.query<RowDataPacket[]>("SELECT id, country, state, city FROM countries ORDER BY country ASC, state ASC, city IS NOT NULL, city ASC");

    const collectionMap: Record<string, string> = {};
    rawCollRows.forEach(c => { collectionMap[c.title] = c.description || ""; });

    const photo: any = mapDBPhotoToAdminPhoto(rows[0], collectionMap);
    photo.collection_ids = collectionIds;
    photo.category_ids = categoryIds;

    res.render("photo-form", {
      nav: "photos",
      mode: "edit",
      photo,
      originalSlug: photo.slug,
      categories: catRows,
      collections: collRows,
      cameras: camRows,
      lenses: lensRows,
      countries: countryRows,
      returnPage: req.query.page || "",
      returnSearch: req.query.search || ""
    });
  } catch (error) {
    console.error("Error rendering edit photo form:", error);
    res.status(500).send("Error rendering edit photo form");
  }
};

// Re-shows the add/edit form with what was submitted and an error above it.
const renderPhotoFormError = async (
  req: Request,
  res: Response,
  status: number,
  mode: "add" | "edit",
  src: string,
  error: string
) => {
  const photo = photoFromBody(req);
  photo.src = src || photo.src;

  const { catRows, collRows } = await formChoices(photo.category_ids || [], photo.collection_ids || []);
  const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY id ASC");
  const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY id ASC");
  const [countryRows] = await pool.query<RowDataPacket[]>("SELECT id, country, state, city FROM countries ORDER BY country ASC, state ASC, city IS NOT NULL, city ASC");

  return res.status(status).render("photo-form", {
    nav: mode === "add" ? "add" : "photos",
    mode,
    photo,
    slugAuto: req.body.slug_auto === "1" ? "1" : "0",
    ...(mode === "edit"
      ? { originalSlug: req.params.slug, returnPage: req.body.page || "", returnSearch: req.body.search || "" }
      : {}),
    categories: catRows,
    collections: collRows,
    cameras: camRows,
    lenses: lensRows,
    countries: countryRows,
    error
  });
};

export type UploadedFile = { s3Key: string; photoUrl: string; variants: ImageVariantInfo | null };

/** Puts the original in S3 and makes its resized WebP copies. */
const uploadPhotoFile = async (file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<UploadedFile> => {
  const s3Key = `photos/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: s3Key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: IMMUTABLE_CACHE,
  }));

  const variants = await tryCreateImageVariants(file.buffer, s3Key);
  const bucketName = process.env.AWS_S3_BUCKET_NAME || "";
  const region = process.env.AWS_REGION || "us-east-1";
  return { s3Key, photoUrl: `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`, variants };
};

/** Removes an upload's original and resized copies, e.g. when saving the photo then fails. */
const discardUploadedFile = async (file: UploadedFile) => {
  if (!file.s3Key) return;
  const keys = [file.s3Key];
  const v = file.variants;
  if (v?.variant_base) {
    String(v.variant_widths || "").split(",").filter(Boolean).forEach(w => keys.push(`${v.variant_base}-${w}.webp`));
  }
  try {
    await s3.send(new DeleteObjectsCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true },
    }));
  } catch (error) {
    console.error("Could not remove unused upload from S3:", keys, error);
  }
};

const isDupEntry = (error: any): boolean => Boolean(error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062));
/** Which unique key a duplicate-entry error hit, e.g. "slug" or "uq_photos_drive_file_id". */
const dupKey = (error: any): string => (String(error?.sqlMessage || "").match(/for key '(?:[^.']*\.)?([^']+)'/) || [])[1] || "";

/**
 * Inserts a photo from the add-photo form fields (used by Add photo and Bulk upload).
 * An automatic slug is re-picked if another upload grabbed it meanwhile.
 * driveFileId is set only by the server (Bulk upload), never read from the form.
 */
const insertPhotoFromBody = async (req: Pick<Request, "body">, file: UploadedFile, driveFileId: string | null = null): Promise<{ id: number; slug: string }> => {
  const cap = String(req.body.cap || "").trim();
  const requested = slugFromBody(req);
  const title = (req.body.title || cap).trim();
  const ref = (req.body.ref || "").trim();
  const categoryIds = parseCategoryIds(req.body);
  const category_id = categoryIds[0] ?? null;
  const species = String(req.body.species || "").trim();
  const scientificName = String(req.body.scientific_name || "").trim();
  const collectionIds = parseCollectionIds(req.body);
  const collection_id = collectionIds[0] ?? null;
  const camera_id = req.body.camera_id ? parseInt(req.body.camera_id, 10) : null;
  const lens_id = req.body.lens_id ? parseInt(req.body.lens_id, 10) : null;
  const country_id = req.body.country_id ? parseInt(req.body.country_id, 10) : null;
  const state = (req.body.state || "").trim();
  const date = (req.body.date || "").trim();
  const about = (req.body.about || "").trim();
  const altNote = (req.body.altNote || "").trim();
  const tags = normalizeTags(req.body.tags);
  const alt = (req.body.alt || "").trim();
  const l = req.body.l || "";
  const t = req.body.t || "";
  const w = req.body.w || "";
  const h = req.body.h || "";
  const live = req.body.live !== "draft";
  const metadata = JSON.stringify(readMeta(req.body));
  const { s3Key, photoUrl, variants } = file;

  for (let attempt = 0; ; attempt++) {
    const slug = requested.auto ? await uniqueSlug(requested.slug) : requested.slug;
    try {
      const [insertResult] = await pool.query<any>(
        `INSERT INTO photos (
          title, cap, slug, ref, url, s3_key, alt, category_id, collection_id, camera_id, lens_id, country_id, state, date, description, l, t, w, h, live, metadata, alt_note, tags,
          species, scientific_name, drive_file_id,
          variant_base, variant_widths, img_width, img_height, img_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, cap, slug, ref, photoUrl, s3Key, alt, category_id, collection_id, camera_id, lens_id, country_id, state, date, about, l, t, w, h, live, metadata, altNote, tags || null,
          species || null, scientificName || null, driveFileId,
          variants?.variant_base ?? null, variants?.variant_widths ?? null, variants?.img_width ?? null, variants?.img_height ?? null, variants?.img_color ?? null]
      );
      await savePhotoCollections(insertResult.insertId, collectionIds);
      await savePhotoCategories(insertResult.insertId, categoryIds);
      return { id: insertResult.insertId, slug };
    } catch (error) {
      if (!(requested.auto && isDupEntry(error) && dupKey(error) === "slug" && attempt < 3)) throw error;
    }
  }
};

const createPhoto = async (req: Request, res: Response) => {
  let photoUrl = req.body.src || "";

  try {
    // Checked before the S3 upload, so a rejected form leaves no stray file.
    const invalid = photoFormError(req, Boolean(req.file || req.body.src));

    if (invalid) {
      return renderPhotoFormError(req, res, 400, "add", photoUrl, invalid);
    }

    const file: UploadedFile = req.file
      ? await uploadPhotoFile(req.file)
      : { s3Key: "", photoUrl, variants: null };
    photoUrl = file.photoUrl;

    try {
      await insertPhotoFromBody(req, file);
    } catch (error) {
      if (req.file) await discardUploadedFile(file);
      throw error;
    }

    res.redirect("/admin/photos?flash=Photo+added");
  } catch (error: any) {
    console.error("Error creating photo:", error);
    if (isDupEntry(error)) {
      return renderPhotoFormError(req, res, 409, "add", photoUrl,
        `A photo with slug "${slugify(req.body.slug || "")}" already exists. Please choose a different slug.`);
    }
    res.status(500).send("Photo upload failed!");
  }
};

const updatePhoto = async (req: Request, res: Response) => {
  let s3Key = "";
  let photoUrl = req.body.src || "";
  let variants: ImageVariantInfo | null = null;

  try {
    const targetSlug = req.params.slug;
    const [rows] = await pool.query<DBPhotoRow[]>("SELECT * FROM photos WHERE slug = ?", [targetSlug]);
    if (rows.length === 0) {
      return res.status(404).send("Photo not found");
    }

    const existing = rows[0];
    s3Key = existing.s3_key || "";
    photoUrl = existing.url || req.body.src || "";

    // Checked before the S3 upload, so a rejected form leaves no stray file.
    const invalid = photoFormError(req, Boolean(req.file || photoUrl || s3Key));

    if (invalid) {
      return renderPhotoFormError(req, res, 400, "edit", photoUrl, invalid);
    }

    if (req.file) {
      const file = req.file;
      s3Key = `photos/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: IMMUTABLE_CACHE,
      });

      await s3.send(command);

      variants = await tryCreateImageVariants(file.buffer, s3Key);

      const bucketName = process.env.AWS_S3_BUCKET_NAME || "";
      const region = process.env.AWS_REGION || "us-east-1";
      photoUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    }

    const cap = String(req.body.cap || "").trim();

    // An existing photo keeps its slug unless it's explicitly changed, so
    // editing other fields never moves its page address.
    const requested = slugFromBody(req);
    let slug = requested.slug;

    if (slug !== existing.slug && requested.auto) {
      slug = await uniqueSlug(slug, existing.id);
    }

    const title = (req.body.title || cap).trim();
    const ref = (req.body.ref || "").trim();
    const categoryIds = parseCategoryIds(req.body);
    const category_id = categoryIds[0] ?? null;
    const collectionIds = parseCollectionIds(req.body);
    const collection_id = collectionIds[0] ?? null;
    const camera_id = req.body.camera_id ? parseInt(req.body.camera_id, 10) : null;
    const lens_id = req.body.lens_id ? parseInt(req.body.lens_id, 10) : null;
    const country_id = req.body.country_id ? parseInt(req.body.country_id, 10) : null;
    const state = (req.body.state || "").trim();
    const date = (req.body.date || "").trim();
    const about = (req.body.about || "").trim();
    const altNote = (req.body.altNote || "").trim();
    const tags = normalizeTags(req.body.tags);
    const alt = (req.body.alt || "").trim();
    const l = req.body.l || "";
    const t = req.body.t || "";
    const w = req.body.w || "";
    const h = req.body.h || "";
    const live = req.body.live !== "draft";
    const metadata = JSON.stringify(readMeta(req.body));

    await pool.query(
      `UPDATE photos SET
        title = ?, cap = ?, slug = ?, ref = ?, url = ?, s3_key = ?, alt = ?, category_id = ?, collection_id = ?, camera_id = ?, lens_id = ?, country_id = ?, state = ?, date = ?, description = ?, l = ?, t = ?, w = ?, h = ?, live = ?, metadata = ?, tags = ?
      WHERE slug = ?`,
      [title, cap, slug, ref, photoUrl, s3Key, alt, category_id, collection_id, camera_id, lens_id, country_id, state, date, about, l, t, w, h, live, metadata, tags || null, targetSlug]
    );

    await savePhotoCollections(existing.id, collectionIds);
    await savePhotoCategories(existing.id, categoryIds);

    // A new file replaces the old variants; a failed generation clears
    // them so the site falls back to the new original, not the old copies.
    if (req.file) {
      await pool.query(
        `UPDATE photos SET variant_base = ?, variant_widths = ?, img_width = ?, img_height = ?, img_color = ? WHERE slug = ?`,
        [variants?.variant_base ?? null, variants?.variant_widths ?? null, variants?.img_width ?? null, variants?.img_height ?? null, variants?.img_color ?? null, slug]
      );
    }

    const page = req.body.page || "1";
    const search = req.body.search ? "&search=" + encodeURIComponent(String(req.body.search)) : "";
    res.redirect("/admin/photos?page=" + page + search + "&flash=Photo+saved");
  } catch (error: any) {
    console.error("Error updating photo:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      return renderPhotoFormError(req, res, 409, "edit", photoUrl,
        `A photo with slug "${slugify(req.body.slug || "")}" already exists. Please choose a different slug.`);
    }
    res.status(500).send("Error updating photo");
  }
};

const togglePhoto = async (req: Request, res: Response) => {
  try {
    const page = req.query.page || "1";
    const search = req.query.search ? "&search=" + encodeURIComponent(String(req.query.search)) : "";
    await pool.query("UPDATE photos SET live = NOT live WHERE slug = ?", [req.params.slug]);
    res.redirect("/admin/photos?page=" + page + search);
  } catch (error) {
    console.error("Error toggling photo:", error);
    res.status(500).send("Error toggling photo");
  }
};

const deletePhoto = async (req: Request, res: Response) => {
  try {
    const page = req.query.page || "1";
    const search = req.query.search ? "&search=" + encodeURIComponent(String(req.query.search)) : "";
    await pool.query("DELETE FROM photos WHERE slug = ?", [req.params.slug]);
    res.redirect("/admin/photos?page=" + page + search + "&flash=Photo+deleted");
  } catch (error) {
    console.error("Error deleting photo:", error);
    res.status(500).send("Error deleting photo");
  }
};

// ---- JSON API Endpoints -----------------------------------------------------

const getPhotosAPI = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || req.query.q || "").trim();
    const [photoRows] = await pool.query<DBPhotoRow[]>(`${SELECT_ADMIN_PHOTOS} ORDER BY p.id DESC`);
    const [collRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title, description FROM collections ORDER BY id ASC");
    const collectionMap: Record<string, string> = {};
    collRows.forEach(c => { collectionMap[c.title] = c.description || ""; });

    let photoList = photoRows.map(r => mapDBPhotoToAdminPhoto(r, collectionMap));

    if (search) {
      const q = search.toLowerCase();
      photoList = photoList.filter(p =>
        p.cap.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q) ||
        p.camera.toLowerCase().includes(q) ||
        (p.lens || "").toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.date.toLowerCase().includes(q) ||
        p.about.toLowerCase().includes(q) ||
        (p.meta || []).some(m => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, search, count: photoList.length, photos: photoList });
  } catch (error) {
    console.error("API error fetching photos:", error);
    res.status(500).json({ success: false, error: "Failed to fetch photos" });
  }
};

const getPhotoBySlugAPI = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<DBPhotoRow[]>(`${SELECT_ADMIN_PHOTOS} WHERE p.slug = ?`, [req.params.slug]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Photo not found" });
    }
    const [collRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title, description FROM collections ORDER BY id ASC");
    const collectionMap: Record<string, string> = {};
    collRows.forEach(c => { collectionMap[c.title] = c.description || ""; });

    const photo = mapDBPhotoToAdminPhoto(rows[0], collectionMap);
    res.json({ success: true, photo });
  } catch (error) {
    console.error("API error fetching photo details:", error);
    res.status(500).json({ success: false, error: "Failed to fetch photo detail" });
  }
};

export default {
  getPhotos,
  getNewPhotoForm,
  getEditPhotoForm,
  createPhoto,
  updatePhoto,
  togglePhoto,
  deletePhoto,
  getPhotosAPI,
  getPhotoBySlugAPI
};

// Shared with the Bulk upload controller.
export {
  slugify,
  parseIds,
  uploadPhotoFile,
  discardUploadedFile,
  insertPhotoFromBody,
  isDupEntry,
  dupKey,
};
