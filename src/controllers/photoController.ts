import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import s3 from "../config/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { AdminPhoto, MetaItem } from "../types/admin";

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
  l: string;
  t: string;
  w: string;
  h: string;
  live: number | boolean;
  metadata: any;
}

const slugify = (s: string): string =>
  String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const CAP_MAX_LENGTH = 22;

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

const blankPhoto = (): AdminPhoto => ({
  cap: "", slug: "", title: "", ref: "", category: "", collection: "", camera: "",
  category_id: null, collection_id: null, camera_id: null, lens_id: null, country_id: null, state: "",
  date: "", about: "", altNote: "", src: "", alt: "",
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
    category_id: req.body.category_id ? parseInt(req.body.category_id, 10) : null,
    collection_id: req.body.collection_id ? parseInt(req.body.collection_id, 10) : null,
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
    src: photoSrc,
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
    const limit = 8;
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

const getNewPhotoForm = async (req: Request, res: Response) => {
  try {
    const [catRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM categories ORDER BY id ASC");
    const [collRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM collections ORDER BY id ASC");
    const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY id ASC");
    const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY id ASC");
    const [countryRows] = await pool.query<RowDataPacket[]>("SELECT id, country, state FROM countries ORDER BY country ASC, state ASC");

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

    const [catRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM categories ORDER BY id ASC");
    const [collRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title, description FROM collections ORDER BY id ASC");
    const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY id ASC");
    const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY id ASC");
    const [countryRows] = await pool.query<RowDataPacket[]>("SELECT id, country, state FROM countries ORDER BY country ASC, state ASC");

    const collectionMap: Record<string, string> = {};
    collRows.forEach(c => { collectionMap[c.title] = c.description || ""; });

    const photo = mapDBPhotoToAdminPhoto(rows[0], collectionMap);

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

const createPhoto = async (req: Request, res: Response) => {
  let s3Key = "";
  let photoUrl = req.body.src || "";

  try {
    if (req.file) {
      const file = req.file;
      s3Key = `photos/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3.send(command);

      const bucketName = process.env.AWS_S3_BUCKET_NAME || "";
      const region = process.env.AWS_REGION || "us-east-1";
      photoUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    }

  const cap = String(req.body.cap || "").trim();

if (!cap || cap.length > CAP_MAX_LENGTH) {
  return res
    .status(400)
    .send(`Hover caption must be ${CAP_MAX_LENGTH} characters or fewer.`);
}

const slug = slugify(req.body.slug || cap);
    const title = (req.body.title || cap).trim();
    const ref = (req.body.ref || "").trim();
    const category_id = req.body.category_id ? parseInt(req.body.category_id, 10) : null;
    const collection_id = req.body.collection_id ? parseInt(req.body.collection_id, 10) : null;
    const camera_id = req.body.camera_id ? parseInt(req.body.camera_id, 10) : null;
    const lens_id = req.body.lens_id ? parseInt(req.body.lens_id, 10) : null;
    const country_id = req.body.country_id ? parseInt(req.body.country_id, 10) : null;
    const state = (req.body.state || "").trim();
    const date = (req.body.date || "").trim();
    const about = (req.body.about || "").trim();
    const altNote = (req.body.altNote || "").trim();
    const alt = (req.body.alt || "").trim();
    const l = req.body.l || "";
    const t = req.body.t || "";
    const w = req.body.w || "";
    const h = req.body.h || "";
    const live = req.body.live !== "draft";
    const metadata = JSON.stringify(readMeta(req.body));

    if (!slug) {
      return res.redirect("/admin/photos/new");
    }

    await pool.query(
      `INSERT INTO photos (
        title, cap, slug, ref, url, s3_key, alt, category_id, collection_id, camera_id, lens_id, country_id, state, date, description, l, t, w, h, live, metadata, alt_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, cap, slug, ref, photoUrl, s3Key, alt, category_id, collection_id, camera_id, lens_id, country_id, state, date, about, l, t, w, h, live, metadata, altNote]
    );

    res.redirect("/admin/photos?flash=Photo+added");
  } catch (error: any) {
    console.error("Error creating photo:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const photo = photoFromBody(req);
      photo.src = photoUrl || photo.src;
      const [catRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM categories ORDER BY id ASC");
      const [collRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM collections ORDER BY id ASC");
      const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY id ASC");
      const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY id ASC");
      const [countryRows] = await pool.query<RowDataPacket[]>("SELECT id, country, state FROM countries ORDER BY country ASC, state ASC");
      return res.status(409).render("photo-form", {
        nav: "add",
        mode: "add",
        photo,
        categories: catRows,
        collections: collRows,
        cameras: camRows,
        lenses: lensRows,
        countries: countryRows,
        error: `A photo with slug "${photo.slug}" already exists. Please choose a different slug.`
      });
    }
    res.status(500).send("Photo upload failed!");
  }
};

const updatePhoto = async (req: Request, res: Response) => {
  let s3Key = "";
  let photoUrl = req.body.src || "";

  try {
    const targetSlug = req.params.slug;
    const [rows] = await pool.query<DBPhotoRow[]>("SELECT * FROM photos WHERE slug = ?", [targetSlug]);
    if (rows.length === 0) {
      return res.status(404).send("Photo not found");
    }

    const existing = rows[0];
    s3Key = existing.s3_key || "";
    photoUrl = existing.url || req.body.src || "";

    if (req.file) {
      const file = req.file;
      s3Key = `photos/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3.send(command);

      const bucketName = process.env.AWS_S3_BUCKET_NAME || "";
      const region = process.env.AWS_REGION || "us-east-1";
      photoUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    }

  const cap = String(req.body.cap || "").trim();

if (!cap || cap.length > CAP_MAX_LENGTH) {
  return res
    .status(400)
    .send(`Hover caption must be ${CAP_MAX_LENGTH} characters or fewer.`);
}

const slug = slugify(req.body.slug || cap) || existing.slug;
    const title = (req.body.title || cap).trim();
    const ref = (req.body.ref || "").trim();
    const category_id = req.body.category_id ? parseInt(req.body.category_id, 10) : null;
    const collection_id = req.body.collection_id ? parseInt(req.body.collection_id, 10) : null;
    const camera_id = req.body.camera_id ? parseInt(req.body.camera_id, 10) : null;
    const lens_id = req.body.lens_id ? parseInt(req.body.lens_id, 10) : null;
    const country_id = req.body.country_id ? parseInt(req.body.country_id, 10) : null;
    const state = (req.body.state || "").trim();
    const date = (req.body.date || "").trim();
    const about = (req.body.about || "").trim();
    const altNote = (req.body.altNote || "").trim();
    const alt = (req.body.alt || "").trim();
    const l = req.body.l || "";
    const t = req.body.t || "";
    const w = req.body.w || "";
    const h = req.body.h || "";
    const live = req.body.live !== "draft";
    const metadata = JSON.stringify(readMeta(req.body));

    await pool.query(
      `UPDATE photos SET
        title = ?, cap = ?, slug = ?, ref = ?, url = ?, s3_key = ?, alt = ?, category_id = ?, collection_id = ?, camera_id = ?, lens_id = ?, country_id = ?, state = ?, date = ?, description = ?, l = ?, t = ?, w = ?, h = ?, live = ?, metadata = ?
      WHERE slug = ?`,
      [title, cap, slug, ref, photoUrl, s3Key, alt, category_id, collection_id, camera_id, lens_id, country_id, state, date, about, l, t, w, h, live, metadata, targetSlug]
    );

    const page = req.body.page || "1";
    const search = req.body.search ? "&search=" + encodeURIComponent(String(req.body.search)) : "";
    res.redirect("/admin/photos?page=" + page + search + "&flash=Photo+saved");
  } catch (error: any) {
    console.error("Error updating photo:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const photo = photoFromBody(req);
      photo.src = photoUrl || photo.src;
      const [catRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM categories ORDER BY id ASC");
      const [collRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title, description FROM collections ORDER BY id ASC");
      const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY id ASC");
      const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY id ASC");
      const [countryRows] = await pool.query<RowDataPacket[]>("SELECT id, country, state FROM countries ORDER BY country ASC, state ASC");
      return res.status(409).render("photo-form", {
        nav: "photos",
        mode: "edit",
        photo,
        originalSlug: req.params.slug,
        returnPage: req.body.page || "",
        returnSearch: req.body.search || "",
        categories: catRows,
        collections: collRows,
        cameras: camRows,
        lenses: lensRows,
        countries: countryRows,
        error: `A photo with slug "${photo.slug}" already exists. Please choose a different slug.`
      });
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

