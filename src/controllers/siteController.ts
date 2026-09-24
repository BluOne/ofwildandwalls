import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

// ── DB row shapes ────────────────────────────────────────────────────────────

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

interface DBCameraRow extends RowDataPacket {
  id: number;
  brand: string;
  model: string;
}

interface DBCollectionRow extends RowDataPacket {
  name: string;
  description: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const buildPhotoUrl = (row: DBPhotoRow): string => {
  if (row.url) return row.url;
  if (row.s3_key) {
    const bucket = process.env.AWS_S3_BUCKET_NAME || "";
    const region = process.env.AWS_REGION || "us-east-1";
    return row.s3_key.startsWith("http")
      ? row.s3_key
      : `https://${bucket}.s3.${region}.amazonaws.com/${row.s3_key}`;
  }
  return "";
};

/** Parse the JSON metadata column into a flat key→value map */
const parseMeta = (raw: any): Record<string, string> => {
  let arr: any[] = [];
  if (!raw) return {};
  if (typeof raw === "string") {
    try { arr = JSON.parse(raw); } catch { return {}; }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "object") {
    arr = Object.values(raw);
  }
  const map: Record<string, string> = {};
  arr.forEach(m => {
    if (m && typeof m === "object") {
      const k = String((m as any).key || (m as any).name || "").trim();
      const v = String((m as any).value || "").trim();
      if (k) { map[k] = v; map[k.toLowerCase()] = v; }
    }
  });
  return map;
};

/**
 * Map a DB row into the shape the site views & API expect.
 * All numeric l/t/w/h are returned as numbers (vw units).
 */
const formatCameraName = (brand?: string, model?: string, fallback?: string): string => {
  if (!model) return fallback || "";
  if (!brand || model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return `${brand} ${model}`;
};

const formatLensName = (brand?: string, model?: string, fallback?: string): string => {
  if (!model) return fallback || "";
  if (!brand || model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return `${brand} ${model}`;
};

const mapToSitePhoto = (
  row: DBPhotoRow,
  collectionMap: Record<string, string> = {}
) => {
  const meta = parseMeta(row.metadata);
  const getMeta = (k: string) => meta[k] || meta[k.toLowerCase()] || "";
  const src = buildPhotoUrl(row);
  const collectionName = (row as any).col_name || "";

  return {
    // flow / grid positioning (keep as strings in DB, expose as numbers)
    l: parseFloat(row.l) || 0,
    t: parseFloat(row.t) || 0,
    w: parseFloat(row.w) || 0,
    h: parseFloat(row.h) || 0,
    // identity
    slug: row.slug || "",
    src,
    alt: row.alt || "",
    cap: row.cap || row.title || "",
    title: row.title || row.cap || "",
    ref: row.ref || "",
    // taxonomy
    category: (row as any).cat_name || "",
    collection: collectionName,
    country: (row as any).country_name || "",
    // Prefer the countries reference table's state (joined via country_id) — the
    // Location filter dropdown (/api/countries) is grouped from that same column,
    // but photos.state is a separate free-text field that a lot of existing rows
    // never had filled in (NULL), which silently broke the state filter for them
    // even though they correctly showed up under the country filter. Falling back
    // to the free-text field only covers legacy rows with no country_id at all.
    state: (row as any).country_state || row.state || "",
    // detail-panel fields
    about: row.description || "",
    altNote: row.alt_note || "",
    aboutCollection: (row as any).col_desc || collectionMap[collectionName] || "",
    camera: formatCameraName((row as any).cam_brand, (row as any).cam_model, getMeta("Camera")),
    lens: formatLensName((row as any).len_brand, (row as any).len_model, getMeta("Lens")),
    location: getMeta("Location"),
    settings: getMeta("Settings"),
    date: row.date || "",
    year: row.date ? String(row.date).slice(0, 4) : "",
    // flags
    live: Boolean(row.live),
    views: ["Flow", "Grid"],
  };
};

/**
 * Build the camera menu structure expected by footer.ejs:
 *   [{ brand, models: [{ name, count }] }]
 * count = number of live photos shot with that camera.
 */
const buildCameraMenu = (
  cameraRows: DBCameraRow[],
  photoRows: RowDataPacket[]
) => {
  // count photos per camera_id (matches the admin panel's counting logic)
  const countMap: Record<number, number> = {};
  photoRows.forEach(r => {
    if (r.camera_id != null) countMap[r.camera_id] = (countMap[r.camera_id] || 0) + 1;
  });

  // group cameras by brand
  const brandMap: Record<string, { name: string; count: number }[]> = {};
  cameraRows.forEach(row => {
    const brand = row.brand || "Other";
    const name = (row.model || "").trim();
    const count = countMap[row.id] || 0;
    if (!brandMap[brand]) brandMap[brand] = [];
    brandMap[brand].push({ name, count });
  });

  return Object.entries(brandMap).map(([brand, models]) => ({ brand, models }));
};

/** SELECT statement joining entity tables by ID */
const SELECT_SITE_PHOTOS = `
  SELECT
    p.*,
    cat.name AS cat_name,
    col.name AS col_name,
    col.description AS col_desc,
    cam.brand AS cam_brand,
    cam.model AS cam_model,
    len.brand AS len_brand,
    len.model AS len_model,
    co.country AS country_name,
    co.state AS country_state
  FROM photos p
  LEFT JOIN categories cat ON p.category_id = cat.id
  LEFT JOIN collections col ON p.collection_id = col.id
  LEFT JOIN cameras cam ON p.camera_id = cam.id
  LEFT JOIN lenses len ON p.lens_id = len.id
  LEFT JOIN countries co ON p.country_id = co.id
`;

// Number of photos rendered on the flow view's first load, and fetched per
// /api/photos/flow page as the visitor scrolls near the bottom of the canvas.
const FLOW_PAGE_SIZE = 30;

// Number of photos rendered on the grid view's first load, and fetched per
// /api/photos/grid page as the visitor scrolls near either end of the strip.
const GRID_PAGE_SIZE = 30;

// ── Rendered page handlers ───────────────────────────────────────────────────

// Flow and Grid are two tabs of the same gallery page (views/site/index.ejs
// renders both and toggles between them client-side, entirely in the
// browser), so a single query serves both.
const GALLERY_PAGE_SIZE = FLOW_PAGE_SIZE;

/** GET / — gallery page (Flow and Grid tabs) */
const getGallery = async (req: Request, res: Response) => {
  try {
    const [[{ total }]] = await pool.query<any[]>(
      "SELECT COUNT(*) AS total FROM photos p WHERE p.live = 1"
    );
    const [photoRows] = await pool.query<any[]>(
      `${SELECT_SITE_PHOTOS}
       WHERE p.live = 1
       ORDER BY p.id DESC
       LIMIT ?`,
      [GALLERY_PAGE_SIZE]
    );
    const [camRows] = await pool.query<DBCameraRow[]>(
      "SELECT id, brand, model FROM cameras ORDER BY id ASC"
    );

    const photos = photoRows.map(r => {
      const p = mapToSitePhoto(r, {});
      p.category = r.cat_name || p.category;
      p.collection = r.col_name || p.collection;
      p.aboutCollection = r.col_desc || p.aboutCollection;
      return p;
    });

    const cameras = buildCameraMenu(camRows, photoRows);
    const hasMore = photos.length < total;

    res.render("index", {
      title: "Of Wild & Walls",
      photos,
      cameras,
      hasMore,
      nextOffset: photos.length,
      pageSize: GALLERY_PAGE_SIZE,
    });
  } catch (err) {
    console.error("Error rendering gallery page:", err);
    res.status(500).send("Error loading page");
  }
};

/** GET /photo/:slug — detail view */
const getPhotoDetail = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<any[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.slug = ? AND p.live = 1`,
      [req.params.slug]
    );
    if (rows.length === 0) return res.status(404).send("Photo not found");

    // Filters carried over from the flow/grid view (category, collection, camera, lens —
    // matched against the same display names used by the client-side filter menus), so the
    // detail page's photo rail only contains the photos the visitor was browsing.
    const filterCategory = String(req.query.category || "").trim().toLowerCase();
    const filterCollection = String(req.query.collection || "").trim().toLowerCase();
    const filterCamera = String(req.query.camera || "").trim().toLowerCase();
    const filterLens = String(req.query.lens || "").trim().toLowerCase();
    const filterCountry = String(req.query.country || "").trim().toLowerCase();
    const filterYear = String(req.query.year || "").trim().toLowerCase();
    const hasFilters = !!(filterCategory || filterCollection || filterCamera || filterLens || filterCountry || filterYear);

    const [allPhotoRowsRaw] = await pool.query<any[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.live = 1 ORDER BY p.id DESC`
    );
    const [camRows] = await pool.query<DBCameraRow[]>(
      "SELECT id, brand, model FROM cameras ORDER BY id ASC"
    );

    const rowMatchesFilters = (r: any): boolean => {
      if (filterCategory && (r.cat_name || "").trim().toLowerCase() !== filterCategory) return false;
      if (filterCollection && (r.col_name || "").trim().toLowerCase() !== filterCollection) return false;
      if (filterCamera && formatCameraName(r.cam_brand, r.cam_model, "").trim().toLowerCase() !== filterCamera) return false;
      if (filterLens && formatLensName(r.len_brand, r.len_model, "").trim().toLowerCase() !== filterLens) return false;
      if (filterCountry) {
        if (filterCountry.startsWith("country::")) {
          if ((r.country_name || "").trim().toLowerCase() !== filterCountry.replace("country::", "")) return false;
        } else if (filterCountry.startsWith("state::")) {
          if ((r.country_state || "").trim().toLowerCase() !== filterCountry.replace("state::", "")) return false;
        } else {
          const target = filterCountry;
          if ((r.country_name || "").trim().toLowerCase() !== target && (r.country_state || "").trim().toLowerCase() !== target) return false;
        }
      }
      if (filterYear && String(r.date || "").slice(0, 4) !== filterYear) return false;
      return true;
    };

    let allPhotoRows = hasFilters ? allPhotoRowsRaw.filter(rowMatchesFilters) : allPhotoRowsRaw;
    // Always keep the currently open photo in the rail, even if it no longer matches
    // (e.g. a stale/shared filtered link) so the page never renders with an empty rail.
    if (!allPhotoRows.some(r => r.slug === rows[0].slug)) {
      allPhotoRows = [rows[0], ...allPhotoRows];
    }

    const filterQuery = [
      filterCategory ? `category=${encodeURIComponent(req.query.category as string)}` : "",
      filterCollection ? `collection=${encodeURIComponent(req.query.collection as string)}` : "",
      filterCamera ? `camera=${encodeURIComponent(req.query.camera as string)}` : "",
      filterLens ? `lens=${encodeURIComponent(req.query.lens as string)}` : "",
      filterCountry ? `country=${encodeURIComponent(req.query.country as string)}` : "",
      filterYear ? `year=${encodeURIComponent(req.query.year as string)}` : "",
    ].filter(Boolean).join("&");

    const buildDetailsFromJoined = (r: any) => {
      const m = parseMeta(r.metadata);
      const gM = (k: string) => m[k] || m[k.toLowerCase()] || "";
      const catName = r.cat_name || "Photography";
      const colName = r.col_name || "";
      const camName = formatCameraName(r.cam_brand, r.cam_model, gM("Camera"));
      const lenName = formatLensName(r.len_brand, r.len_model, gM("Lens"));

      return {
        kicker: catName,
        title: r.cap || r.title || "",
        ref: r.ref || "",
        about: r.description || "",
        altNote: r.alt_note || "",
        collection: r.col_desc || colName,
        collectionHref: "#",
        camera: camName,
        lens: lenName,
        date: r.date || "",
        location: gM("Location"),
        category: catName,
        settings: gM("Settings"),
      };
    };

    const mapJoinedToSitePhoto = (r: any) => {
      const p = mapToSitePhoto(r, {});
      p.category = r.cat_name || p.category;
      p.collection = r.col_name || p.collection;
      p.aboutCollection = r.col_desc || p.aboutCollection;
      return p;
    };

    const photo = mapJoinedToSitePhoto(rows[0]);
    const photos = allPhotoRows.map(r => ({
      ...mapJoinedToSitePhoto(r),
      details: buildDetailsFromJoined(r)
    }));
    const cameras = buildCameraMenu(camRows, allPhotoRows);
    const details = buildDetailsFromJoined(rows[0]);

    res.render("detail", {
      title: photo.cap,
      photo,
      photos,
      cameras,
      details,
      filterQuery,
    });
  } catch (err) {
    console.error("Error rendering detail page:", err);
    res.status(500).send("Error loading page");
  }
};

// ── JSON API endpoints ────────────────────────────────────────────────────────

/** GET /api/photos/flow — live photos tagged for the Flow view (paginated: ?offset=&limit=) */
const getFlowAPI = async (req: Request, res: Response) => {
  try {
    const MAX_LIMIT = 100;
    let limit = parseInt(String(req.query.limit || ""), 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = FLOW_PAGE_SIZE;
    limit = Math.min(limit, MAX_LIMIT);

    let offset = parseInt(String(req.query.offset || ""), 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    const [[{ total }]] = await pool.query<any[]>(
      "SELECT COUNT(*) AS total FROM photos p WHERE p.live = 1"
    );
    const [photoRows] = await pool.query<DBPhotoRow[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.live = 1 ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [collRows] = await pool.query<DBCollectionRow[]>(
      "SELECT name, description FROM collections ORDER BY id ASC"
    );

    const collectionMap: Record<string, string> = {};
    collRows.forEach(c => { collectionMap[c.name] = c.description || ""; });

    const photos = photoRows.map(r => mapToSitePhoto(r, collectionMap));
    const nextOffset = offset + photos.length;
    const hasMore = nextOffset < total;

    res.json({ success: true, count: photos.length, total, offset, nextOffset, hasMore, photos });
  } catch (err) {
    console.error("API error /api/photos/flow:", err);
    res.status(500).json({ success: false, error: "Failed to fetch flow photos" });
  }
};

/** GET /api/photos/grid — live photos tagged for the Grid view (paginated: ?offset=&limit=) */
const getGridAPI = async (req: Request, res: Response) => {
  try {
    const MAX_LIMIT = 100;
    let limit = parseInt(String(req.query.limit || ""), 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = GRID_PAGE_SIZE;
    limit = Math.min(limit, MAX_LIMIT);

    let offset = parseInt(String(req.query.offset || ""), 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    const [[{ total }]] = await pool.query<any[]>(
      "SELECT COUNT(*) AS total FROM photos p WHERE p.live = 1"
    );
    const [photoRows] = await pool.query<DBPhotoRow[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.live = 1 ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [collRows] = await pool.query<DBCollectionRow[]>(
      "SELECT name, description FROM collections ORDER BY id ASC"
    );

    const collectionMap: Record<string, string> = {};
    collRows.forEach(c => { collectionMap[c.name] = c.description || ""; });

    const photos = photoRows.map(r => mapToSitePhoto(r, collectionMap));
    const nextOffset = offset + photos.length;
    const hasMore = nextOffset < total;

    res.json({ success: true, count: photos.length, total, offset, nextOffset, hasMore, photos });
  } catch (err) {
    console.error("API error /api/photos/grid:", err);
    res.status(500).json({ success: false, error: "Failed to fetch grid photos" });
  }
};

/** GET /api/photos — all live photos (both views) */
const getPhotosAPI = async (req: Request, res: Response) => {
  try {
    const category_id = String(req.query.category_id || "").trim();
    const collection_id = String(req.query.collection_id || "").trim();
    const q = String(req.query.q || req.query.search || "").trim().toLowerCase();

    let sql = `${SELECT_SITE_PHOTOS} WHERE p.live = 1`;
    const params: any[] = [];

    if (category_id) {
      sql += " AND p.category_id = ?";
      params.push(category_id);
    }
    if (collection_id) {
      sql += " AND p.collection_id = ?";
      params.push(collection_id);
    }
    sql += " ORDER BY p.id DESC";

    const [photoRows] = await pool.query<DBPhotoRow[]>(sql, params);
    const [collRows] = await pool.query<DBCollectionRow[]>(
      "SELECT name, description FROM collections ORDER BY id ASC"
    );

    const collectionMap: Record<string, string> = {};
    collRows.forEach(c => { collectionMap[c.name] = c.description || ""; });

    let photos = photoRows.map(r => mapToSitePhoto(r, collectionMap));

    // client-side text search after mapping
    if (q) {
      photos = photos.filter(p =>
        p.cap.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q) ||
        p.camera.toLowerCase().includes(q) ||
        p.lens.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.date.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: photos.length, photos });
  } catch (err) {
    console.error("API error /api/photos:", err);
    res.status(500).json({ success: false, error: "Failed to fetch photos" });
  }
};

/** GET /api/photos/:slug — single photo detail */
const getPhotoBySlugAPI = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<DBPhotoRow[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.slug = ? AND p.live = 1`,
      [req.params.slug]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Photo not found" });
    }
    const [collRows] = await pool.query<DBCollectionRow[]>(
      "SELECT name, description FROM collections ORDER BY id ASC"
    );
    const collectionMap: Record<string, string> = {};
    collRows.forEach(c => { collectionMap[c.name] = c.description || ""; });

    const photo = mapToSitePhoto(rows[0], collectionMap);

    // extended detail fields
    const d = rows[0];
    const meta = parseMeta(d.metadata);
    const getMeta = (k: string) => meta[k] || meta[k.toLowerCase()] || "";

    const details = {
      kicker: (d as any).cat_name || "Photography",
      title: d.cap || d.title || "",
      ref: d.ref || "",
      about: d.description || "",
      altNote: d.alt_note || "",
      collection: (d as any).col_desc || collectionMap[(d as any).col_name || ""] || (d as any).col_name || "",
      collectionHref: "#",
      camera: (d as any).cam_model || getMeta("Camera"),
      lens: (d as any).len_model || getMeta("Lens"),
      date: d.date || "",
      location: getMeta("Location"),
      category: (d as any).cat_name || "",
      settings: getMeta("Settings"),
    };

    res.json({ success: true, photo: { ...photo, details } });
  } catch (err) {
    console.error("API error /api/photos/:slug:", err);
    res.status(500).json({ success: false, error: "Failed to fetch photo" });
  }
};

/** GET /api/cameras — camera menu data for the site footer */
const getCamerasAPI = async (req: Request, res: Response) => {
  try {
    const [camRows] = await pool.query<DBCameraRow[]>(
      "SELECT id, brand, model FROM cameras ORDER BY id ASC"
    );
    const [photoRows] = await pool.query<RowDataPacket[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.live = 1`
    );
    const cameras = buildCameraMenu(camRows, photoRows);
    res.json({ success: true, count: cameras.length, cameras });
  } catch (err) {
    console.error("API error /api/cameras:", err);
    res.status(500).json({ success: false, error: "Failed to fetch cameras" });
  }
};

/** GET /api/lenses — distinct lenses used in live photos, with count */
const getLensesAPI = async (req: Request, res: Response) => {
  try {
    const [lensRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, brand, model FROM lenses ORDER BY id ASC"
    );
    const [photoRows] = await pool.query<RowDataPacket[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.live = 1`
    );

    // count photos per lens_id (matches the admin panel's counting logic)
    const countMap: Record<number, number> = {};
    photoRows.forEach(r => {
      if (r.lens_id != null) countMap[r.lens_id] = (countMap[r.lens_id] || 0) + 1;
    });

    const brandMap: Record<string, { name: string; count: number }[]> = {};
    lensRows.forEach((row: any) => {
      const brand = (row.brand || "Other").trim();
      const fullName = formatLensName(row.brand, row.model, row.model);
      const count = countMap[row.id] || 0;
      if (!brandMap[brand]) brandMap[brand] = [];
      brandMap[brand].push({ name: fullName, count });
    });

    const lenses = Object.entries(brandMap).map(([brand, models]) => ({ brand, models }));
    res.json({ success: true, count: lenses.length, lenses });
  } catch (err) {
    console.error("API error /api/lenses:", err);
    res.status(500).json({ success: false, error: "Failed to fetch lenses" });
  }
};


/** GET /api/categories — all categories with live photo count */
const getCategoriesAPI = async (req: Request, res: Response) => {
  try {
    const [catRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name AS title, parent, description FROM categories ORDER BY name ASC"
    );
    const [photoRows] = await pool.query<RowDataPacket[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.live = 1`
    );
    const countMap: Record<string, number> = {};
    photoRows.forEach(r => {
      const k = (r.cat_name || "").trim().toLowerCase();
      if (k) countMap[k] = (countMap[k] || 0) + 1;
    });

    const categories = catRows.map(c => ({
      id: c.id,
      title: c.title || "",
      parent: c.parent || "",
      description: c.description || "",
      count: countMap[(c.title || "").toLowerCase()] || 0,
    }));

    res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    console.error("API error /api/categories:", err);
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
};

/**
 * GET /api/countries — country/state groups actually used by live photos, each state with
 * its photo count. Unlike categories/cameras/lenses (small curated master lists), the
 * countries reference table holds ~2,800 world country/state rows, so the footer menu is
 * built from what photos actually use rather than the full reference list.
 */
const getCountriesAPI = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT co.country AS country, co.state AS state, COUNT(*) AS cnt
       FROM photos p
       JOIN countries co ON p.country_id = co.id
       WHERE p.live = 1 AND p.country_id IS NOT NULL
       GROUP BY co.country, co.state
       ORDER BY co.country ASC, co.state ASC`
    );

    const groupMap: Record<string, { name: string; count: number }[]> = {};
    rows.forEach(r => {
      const country = r.country || "Other";
      if (!groupMap[country]) groupMap[country] = [];
      groupMap[country].push({ name: r.state, count: Number(r.cnt) || 0 });
    });

    const countries = Object.entries(groupMap).map(([country, states]) => ({ country, states }));
    res.json({ success: true, count: countries.length, countries });
  } catch (err) {
    console.error("API error /api/countries:", err);
    res.status(500).json({ success: false, error: "Failed to fetch countries" });
  }
};

/** GET /api/years — distinct years (from photos.date) used by live photos, with count */
const getYearsAPI = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT LEFT(date, 4) AS year, COUNT(*) AS cnt
       FROM photos
       WHERE live = 1 AND date IS NOT NULL AND date != ''
       GROUP BY LEFT(date, 4)
       ORDER BY year DESC`
    );

    const years = rows
      .filter(r => /^\d{4}$/.test(r.year || ""))
      .map(r => ({ title: r.year, count: Number(r.cnt) || 0 }));

    res.json({ success: true, count: years.length, years });
  } catch (err) {
    console.error("API error /api/years:", err);
    res.status(500).json({ success: false, error: "Failed to fetch years" });
  }
};

/** GET /api/collections — all collections with live photo count */
const getCollectionsAPI = async (req: Request, res: Response) => {
  try {
    const [collRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name AS title, description FROM collections ORDER BY name ASC"
    );
    const [photoRows] = await pool.query<RowDataPacket[]>(
      `${SELECT_SITE_PHOTOS} WHERE p.live = 1`
    );
    const countMap: Record<string, number> = {};
    photoRows.forEach(r => {
      const k = (r.col_name || "").trim().toLowerCase();
      if (k) countMap[k] = (countMap[k] || 0) + 1;
    });

    const collections = collRows.map(c => ({
      id: c.id,
      title: c.title || "",
      description: c.description || "",
      count: countMap[(c.title || "").toLowerCase()] || 0,
    }));

    res.json({ success: true, count: collections.length, collections });
  } catch (err) {
    console.error("API error /api/collections:", err);
    res.status(500).json({ success: false, error: "Failed to fetch collections" });
  }
};

export default {
  // rendered pages
  getGallery,
  getPhotoDetail,
  // JSON APIs
  getFlowAPI,
  getGridAPI,
  getPhotosAPI,
  getPhotoBySlugAPI,
  getCamerasAPI,
  getLensesAPI,
  getCategoriesAPI,
  getCollectionsAPI,
  getCountriesAPI,
  getYearsAPI,
};
