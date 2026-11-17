import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import { downloadDriveImage, driveFileId, probeDriveImage } from "../utils/googleDrive";
import {
  slugify,
  parseIds,
  uploadPhotoFile,
  discardUploadedFile,
  insertPhotoFromBody,
  isDupEntry,
  dupKey,
  type UploadedFile,
} from "./photoController";

/*
 * Bulk upload: a spreadsheet-style grid where each row is one photo taken from
 * a Google Drive link.
 *
 *   draft  — rows still being filled in, saved per admin user (bulk_upload_drafts)
 *   jobs   — rows sent for upload (bulk_upload_jobs). A background worker in this
 *            process downloads each from Drive, stores it in S3 and saves the
 *            photo, writing stage/progress as it goes; the page polls for it.
 *            Failed jobs come back to the grid to be fixed and retried.
 */

// ---- Page --------------------------------------------------------------------

/** Jobs the page shows: everything not cleared away by the admin. */
const listJobs = async (userId: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, status, stage, progress, payload, error, error_field, photo_slug
     FROM bulk_upload_jobs WHERE user_id = ? AND dismissed = 0 ORDER BY id ASC LIMIT 1000`,
    [userId]
  );
  return rows.map(jobView);
};

const jobView = (r: RowDataPacket) => ({
  id: r.id as number,
  status: r.status as string,
  stage: r.stage as string,
  progress: Number(r.progress) || 0,
  error: r.error || "",
  errorField: r.error_field || "",
  slug: r.photo_slug || "",
  payload: r.payload === undefined ? undefined : (typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload),
});

const getBulkUploadPage = async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    // Only published categories and collections can be chosen.
    const [catRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM categories WHERE live = 1 ORDER BY name ASC");
    const [collRows] = await pool.query<RowDataPacket[]>("SELECT id, name AS title FROM collections WHERE live = 1 ORDER BY name ASC");
    const [camRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM cameras ORDER BY brand ASC, model ASC");
    const [lensRows] = await pool.query<RowDataPacket[]>("SELECT id, brand, model FROM lenses ORDER BY brand ASC, model ASC");
    const [countryRows] = await pool.query<RowDataPacket[]>("SELECT id, country, state, city FROM countries ORDER BY country ASC, state ASC, city IS NOT NULL, city ASC");

    res.render("bulk-upload", {
      nav: "bulk",
      categories: catRows,
      collections: collRows,
      cameras: camRows,
      lenses: lensRows,
      countries: countryRows,
      draft: await loadBulkDraft(userId),
      jobs: await listJobs(userId),
    });
  } catch (error) {
    console.error("Error rendering bulk upload page:", error);
    res.status(500).send("Error rendering bulk upload page");
  }
};

// ---- Draft: the grid's rows not sent for upload yet --------------------------

const DRAFT_MAX_ROWS = 1000;

/** The user's saved grid rows (in grid order) and when they were last saved, or null. */
const loadBulkDraft = async (userId: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.job_id, d.drive_url, d.title, d.slug, d.cap, d.ref, d.category_id, d.collection_ids,
       d.camera_id, d.lens_id, d.date, d.country_id, d.place, d.settings, d.description, d.tags, d.alt, d.live, d.updated_at,
       j.id AS failed_job_id, j.error AS job_error, j.error_field AS job_error_field
     FROM bulk_upload_drafts d
     LEFT JOIN bulk_upload_jobs j ON j.id = d.job_id AND j.status = 'failed' AND j.dismissed = 0
     WHERE d.user_id = ? ORDER BY d.position ASC`,
    [userId]
  );
  if (!rows.length) return null;

  const parseList = (v: any): string[] => {
    const list = typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return []; } })() : v;
    return Array.isArray(list) ? list.map(String) : [];
  };
  const idText = (v: any) => (v ? String(v) : "");
  return {
    savedAt: Math.max(...rows.map(r => new Date(r.updated_at).getTime())),
    // Shaped like the grid's own row values.
    rows: rows.map(r => ({
      jobId: r.failed_job_id || null,
      jobError: r.job_error || "",
      jobErrorField: r.job_error_field || "",
      link: r.drive_url || "",
      title: r.title || "",
      slug: r.slug || "",
      cap: r.cap || "",
      ref: r.ref || "",
      category: idText(r.category_id),
      collections: parseList(r.collection_ids),
      camera: idText(r.camera_id),
      lens: idText(r.lens_id),
      date: r.date || "",
      location: idText(r.country_id),
      place: r.place || "",
      settings: r.settings || "",
      description: r.description || "",
      tags: r.tags || "",
      alt: r.alt || "",
      live: r.live ? "live" : "draft",
    })),
  };
};

/**
 * PUT /admin/photos/bulk/draft {rows: [...grid row values]} — replaces the
 * user's saved draft with the grid's current editable rows ([] clears it).
 */
const saveBulkDraft = async (req: Request, res: Response) => {
  const incoming = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, DRAFT_MAX_ROWS) : null;
  if (!incoming) return res.status(400).json({ success: false, error: "Expected { rows: [] }." });

  const text = (v: any, max: number) => String(v ?? "").slice(0, max);
  const id = (v: any) => parseIds(v)[0] ?? null;
  const userId = req.session.userId!;

  const conn = await pool.getConnection();
  try {
    // Only keep ids that still exist, so a deleted category/camera/location can't break the save.
    const ids = (k: string) => [...new Set(incoming.map((r: any) => id(r?.[k])).filter(Boolean))];
    const known = async (table: string, key: string, extra = "", params: any[] = []) => {
      const list = ids(key);
      if (!list.length) return new Set<number>();
      const [found] = await conn.query<RowDataPacket[]>(`SELECT id FROM ${table} WHERE id IN (?) ${extra}`, [list, ...params]);
      return new Set(found.map(f => f.id as number));
    };
    const existing = {
      category: await known("categories", "category"),
      camera: await known("cameras", "camera"),
      lens: await known("lenses", "lens"),
      location: await known("countries", "location"),
      // A row may only point at the user's own failed job.
      jobId: await known("bulk_upload_jobs", "jobId", "AND user_id = ? AND status = 'failed'", [userId]),
    };
    const keep = (r: any, key: keyof typeof existing) => {
      const v = id(r?.[key]);
      return v && existing[key].has(v) ? v : null;
    };

    const values = incoming.map((r: any, i: number) => [
      userId, keep(r, "jobId"), i,
      text(r?.link, 1000), text(r?.title, 255), text(r?.slug, 255), text(r?.cap, 255), text(r?.ref, 255),
      keep(r, "category"), JSON.stringify(parseIds(r?.collections)),
      keep(r, "camera"), keep(r, "lens"), text(r?.date, 20),
      keep(r, "location"), text(r?.place, 255), text(r?.settings, 255),
      text(r?.description, 10000), text(r?.tags, 1000), text(r?.alt, 255),
      r?.live === "live" ? 1 : 0,
    ]);

    await conn.beginTransaction();
    await conn.query("DELETE FROM bulk_upload_drafts WHERE user_id = ?", [userId]);
    if (values.length) {
      await conn.query(
        `INSERT INTO bulk_upload_drafts
          (user_id, job_id, position, drive_url, title, slug, cap, ref,
           category_id, collection_ids, camera_id, lens_id, date, country_id, place, settings, description, tags, alt, live)
         VALUES ?`,
        [values]
      );
    }
    await conn.commit();
    res.json({ success: true, saved: values.length });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error("Error saving bulk upload draft:", error);
    res.status(500).json({ success: false, error: "Couldn't save the draft." });
  } finally {
    conn.release();
  }
};

// ---- Link check & duplicates -------------------------------------------------

/** The photo already imported from this Drive file, if any. */
const findByDriveId = async (id: string): Promise<{ slug: string; title: string } | null> => {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT slug, title FROM photos WHERE drive_file_id = ? LIMIT 1", [id]);
  return rows.length ? { slug: rows[0].slug, title: rows[0].title } : null;
};

/** Whether this Drive file is already waiting in (or going through) the queue. */
const queuedJobFor = async (fileId: string, exceptJobId: number | null): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM bulk_upload_jobs
     WHERE drive_file_id = ? AND status IN ('queued', 'processing') AND (? IS NULL OR id <> ?) LIMIT 1`,
    [fileId, exceptJobId, exceptJobId]
  );
  return rows.length > 0;
};

/**
 * POST /admin/photos/bulk/check {url} — checks one grid row's Drive link as it's
 * entered: is it a Drive file link, does it open publicly, is it an image, and
 * has it been uploaded (or queued) before. Reads only the first bytes of the file.
 */
const checkBulkLink = async (req: Request, res: Response) => {
  const url = String(req.body?.url || "").trim();
  const jobId = parseIds(req.body?.jobId)[0] ?? null;
  const id = driveFileId(url);
  if (!id) return res.json({ ok: false, error: "Not a Google Drive file link." });

  try {
    const duplicate = await findByDriveId(id);
    if (duplicate) return res.json({ ok: false, fileId: id, duplicate, error: "Already uploaded." });
    if (await queuedJobFor(id, jobId)) return res.json({ ok: false, fileId: id, error: "Already queued for upload." });

    const probe = await probeDriveImage(url);
    res.json({ ok: true, fileId: id, filename: probe.filename });
  } catch (error: any) {
    res.json({ ok: false, fileId: id, error: error?.message || "Couldn't open the Drive link." });
  }
};

// ---- Validation --------------------------------------------------------------

/**
 * Checks one row (the grid's fields; see the client's upload payload) and turns
 * it into the Add photo form's terms. Errors are keyed by field:
 * drive_url, title, slug, date, category, collections, camera, lens, location.
 */
const validateRow = async (b: any, jobId: number | null) => {
  const str = (v: any) => String(v ?? "").trim();
  const driveUrl = str(b.drive_url);
  const title = str(b.title);
  // A slug typed in the grid is used exactly (and can clash); otherwise it comes from the title.
  const slugTyped = b.slug_auto === "0";
  const slug = slugify(slugTyped ? b.slug : (b.slug || title)) || (slugTyped ? "" : "photo");
  const categoryId = parseIds(b.category_id)[0] ?? null;
  const collectionIds = parseIds(b.collection_ids);
  const cameraId = parseIds(b.camera_id)[0] ?? null;
  const lensId = parseIds(b.lens_id)[0] ?? null;
  const countryId = parseIds(b.country_id)[0] ?? null;
  const date = str(b.date);

  const errors: Record<string, string> = {};
  const fileId = driveFileId(driveUrl);
  if (!driveUrl) errors.drive_url = "Drive link is required.";
  else if (!fileId) errors.drive_url = "Not a Google Drive file link.";
  if (!title) errors.title = "Panel title is required.";
  if (!slug) errors.slug = "Slug is required.";
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = "Date must be a valid date.";

  // Every dropdown value must still exist in the admin (categories and
  // collections must also be published).
  const exists = async (table: string, list: number[], publishedOnly = false) => {
    if (!list.length) return true;
    const [found] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM ${table} WHERE id IN (?)${publishedOnly ? " AND live = 1" : ""}`, [list]
    );
    return found.length === list.length;
  };
  const stale = (what: string) => `Unknown ${what}. Reload the page to get the current list.`;
  const unpublished = (what: string) => `That ${what} is unpublished or was removed. Reload the page to get the current list.`;
  if (categoryId && !(await exists("categories", [categoryId], true))) errors.category = unpublished("category");
  if (!(await exists("collections", collectionIds, true))) errors.collections = unpublished("collection");
  if (cameraId && !(await exists("cameras", [cameraId]))) errors.camera = stale("camera");
  if (lensId && !(await exists("lenses", [lensId]))) errors.lens = stale("lens");
  let stateName = "";
  if (countryId) {
    const [found] = await pool.query<RowDataPacket[]>("SELECT state FROM countries WHERE id = ?", [countryId]);
    if (!found.length) errors.location = stale("state / country");
    else stateName = found[0].state || "";
  }

  let duplicate: { slug: string; title: string } | null = null;
  if (fileId && !errors.drive_url) {
    duplicate = await findByDriveId(fileId);
    if (duplicate) errors.drive_url = "Already uploaded.";
    else if (await queuedJobFor(fileId, jobId)) errors.drive_url = "Already queued for upload.";
  }
  if (slugTyped && slug && !errors.slug) {
    const [taken] = await pool.query<RowDataPacket[]>("SELECT id FROM photos WHERE slug = ? LIMIT 1", [slug]);
    const [queued] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM bulk_upload_jobs
       WHERE status IN ('queued', 'processing') AND (? IS NULL OR id <> ?)
         AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.slug_auto')) = '0'
         AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.slug')) = ? LIMIT 1`,
      [jobId, jobId, slug]
    );
    if (taken.length || queued.length) errors.slug = `Slug "${slug}" is already used by another photo.`;
  }

  // The Add photo form's fields for insertPhotoFromBody.
  const body = {
    title, slug, slug_auto: slugTyped ? "0" : "1",
    cap: str(b.cap) || title, ref: str(b.ref), alt: str(b.alt) || title,
    category_id: categoryId, collection_ids: collectionIds,
    camera_id: cameraId, lens_id: lensId, date,
    country_id: countryId, state: stateName,
    location: str(b.location), settings: str(b.settings),
    about: str(b.description), tags: str(b.tags),
    live: b.live === "live" ? "live" : "draft",
  };
  return { errors, duplicate, fileId, slug, slugTyped, driveUrl, body };
};

/** Only the fields a job keeps, so nothing else from the request is stored. */
const PAYLOAD_KEYS = ["drive_url", "title", "slug", "slug_auto", "cap", "ref", "category_id", "collection_ids", "camera_id",
  "lens_id", "date", "country_id", "location", "settings", "description", "tags", "alt", "live"];
const pickPayload = (b: any) => {
  const out: Record<string, any> = {};
  PAYLOAD_KEYS.forEach(k => { if (b?.[k] !== undefined) out[k] = b[k]; });
  return out;
};

// ---- Jobs --------------------------------------------------------------------

/**
 * POST /admin/photos/bulk/jobs {rows: [{jobId?, ...row fields}]} — validates
 * every row first; if any has a problem nothing is queued and the problems
 * come back per row. Otherwise each row becomes a queued job (a failed job
 * being retried is reused) and the worker is woken up.
 */
const queueBulkJobs = async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const incoming: any[] = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, DRAFT_MAX_ROWS) : [];
  if (!incoming.length) return res.status(400).json({ success: false, error: "No rows to upload." });

  try {
    // A retried row's job must be the user's own failed job.
    const retryIds = incoming.map(r => parseIds(r?.jobId)[0]).filter(Boolean) as number[];
    const [owned] = retryIds.length
      ? await pool.query<RowDataPacket[]>("SELECT id FROM bulk_upload_jobs WHERE id IN (?) AND user_id = ? AND status = 'failed'", [retryIds, userId])
      : [[] as RowDataPacket[]];
    const retryable = new Set(owned.map(r => r.id as number));

    const results = [];
    const seenFiles: Record<string, number> = {};
    const seenSlugs: Record<string, number> = {};
    for (let i = 0; i < incoming.length; i++) {
      const jobId = parseIds(incoming[i]?.jobId)[0] ?? null;
      const v = await validateRow(incoming[i], jobId && retryable.has(jobId) ? jobId : null);
      // Duplicates inside this batch.
      if (v.fileId && !v.errors.drive_url) {
        if (seenFiles[v.fileId] !== undefined) v.errors.drive_url = `Same Drive file as row ${seenFiles[v.fileId] + 1}.`;
        else seenFiles[v.fileId] = i;
      }
      if (v.slugTyped && v.slug && !v.errors.slug) {
        if (seenSlugs[v.slug] !== undefined) v.errors.slug = `Same slug as row ${seenSlugs[v.slug] + 1}.`;
        else seenSlugs[v.slug] = i;
      }
      results.push({ jobId: jobId && retryable.has(jobId) ? jobId : null, v });
    }

    if (results.some(r => Object.keys(r.v.errors).length)) {
      return res.status(400).json({
        success: false,
        error: "Some rows need fixing before anything is uploaded.",
        rows: results.map(r => ({ errors: r.v.errors, duplicate: r.v.duplicate })),
      });
    }

    const jobs = [];
    for (let i = 0; i < results.length; i++) {
      const payload = JSON.stringify(pickPayload(incoming[i]));
      const { jobId, v } = results[i];
      if (jobId) {
        await pool.query(
          `UPDATE bulk_upload_jobs
           SET status = 'queued', stage = 'queued', progress = 0, payload = ?, drive_file_id = ?, error = NULL,
               error_field = NULL, dismissed = 0, started_at = NULL, finished_at = NULL
           WHERE id = ? AND user_id = ?`,
          [payload, v.fileId, jobId, userId]
        );
        jobs.push({ id: jobId });
      } else {
        const [ins] = await pool.query<any>(
          "INSERT INTO bulk_upload_jobs (user_id, payload, drive_file_id) VALUES (?, ?, ?)",
          [userId, payload, v.fileId]
        );
        jobs.push({ id: ins.insertId as number });
      }
    }

    kickWorker();
    res.json({ success: true, jobs });
  } catch (error) {
    console.error("Error queueing bulk upload:", error);
    res.status(500).json({ success: false, error: "Couldn't queue the upload. Please try again." });
  }
};

/** GET /admin/photos/bulk/jobs?ids=1,2,3 — progress of the user's jobs. */
const getBulkJobs = async (req: Request, res: Response) => {
  const ids = parseIds(String(req.query.ids || "").split(","));
  if (!ids.length) return res.json({ jobs: [] });
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, status, stage, progress, error, error_field, photo_slug
       FROM bulk_upload_jobs WHERE user_id = ? AND id IN (?)`,
      [req.session.userId, ids.slice(0, 1000)]
    );
    res.json({ jobs: rows.map(jobView) });
  } catch (error) {
    console.error("Error reading bulk upload jobs:", error);
    res.status(500).json({ jobs: [], error: "Couldn't read upload progress." });
  }
};

/**
 * POST /admin/photos/bulk/jobs/dismiss {ids} — hides finished or failed jobs from
 * the grid ("Clear uploaded rows", or removing a failed row). Running jobs stay.
 */
const dismissBulkJobs = async (req: Request, res: Response) => {
  const ids = parseIds(req.body?.ids);
  if (!ids.length) return res.json({ success: true });
  try {
    await pool.query(
      "UPDATE bulk_upload_jobs SET dismissed = 1 WHERE user_id = ? AND id IN (?) AND status IN ('done', 'failed')",
      [req.session.userId, ids]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error dismissing bulk upload jobs:", error);
    res.status(500).json({ success: false });
  }
};

// ---- Background worker -------------------------------------------------------

// Two photos at a time: each one downloads from Drive and writes to S3.
const CONCURRENCY = 2;
const POLL_MS = 3000;
let activeJobs = 0;
let workerStarted = false;
let ticking = false;

/** Short, admin-readable reason for a failure (the full error goes to the server log). */
const failureMessage = (error: any): string => {
  if (error?.$metadata) {
    const code = error.Code || error.name || "error";
    return `Image storage (S3) refused the upload: ${code}. Check the AWS settings in .env.`;
  }
  if (error?.code === "ECONNREFUSED" || error?.code === "PROTOCOL_CONNECTION_LOST") return "Couldn't reach the database.";
  return "Upload failed. Please retry.";
};

/** Takes the oldest queued job, marking it as processing so no one else takes it. */
const claimJob = async (): Promise<RowDataPacket | null> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, payload FROM bulk_upload_jobs WHERE status = 'queued' ORDER BY id ASC LIMIT 1 FOR UPDATE SKIP LOCKED"
    );
    if (!rows.length) {
      await conn.commit();
      return null;
    }
    await conn.query(
      `UPDATE bulk_upload_jobs SET status = 'processing', stage = 'checking', progress = 1,
         attempts = attempts + 1, started_at = NOW(), error = NULL, error_field = NULL WHERE id = ?`,
      [rows[0].id]
    );
    await conn.commit();
    return rows[0];
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally {
    conn.release();
  }
};

const setStage = (id: number, stage: string, progress: number) =>
  pool.query("UPDATE bulk_upload_jobs SET stage = ?, progress = ? WHERE id = ?", [stage, Math.round(progress), id]);

const failJob = (id: number, error: string, field: string | null = null) =>
  pool.query(
    `UPDATE bulk_upload_jobs SET status = 'failed', stage = 'failed', error = ?, error_field = ?, finished_at = NOW() WHERE id = ?`,
    [error.slice(0, 500), field, id]
  );

/**
 * One job: check the row again (things may have changed since it was queued),
 * download from Drive (5–60%), store in S3 with resized copies (60–90%), save the
 * photo (90–100%). Any problem marks the job failed with a reason for the grid.
 */
const processJob = async (job: RowDataPacket) => {
  const id = job.id as number;
  const payload = typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload;
  let stored: UploadedFile | null = null;

  try {
    const v = await validateRow(payload, id);
    const field = Object.keys(v.errors)[0];
    if (field) return await failJob(id, v.errors[field], field);

    await setStage(id, "downloading", 5);
    let lastWrite = 0;
    let image;
    try {
      image = await downloadDriveImage(v.driveUrl, (loaded, total) => {
        const now = Date.now();
        if (!total || now - lastWrite < 700) return;
        lastWrite = now;
        setStage(id, "downloading", 5 + Math.min(1, loaded / total) * 55).catch(() => {});
      });
    } catch (error: any) {
      return await failJob(id, error?.message || "Couldn't download from Google Drive.", "drive_url");
    }

    await setStage(id, "storing", 60);
    stored = await uploadPhotoFile({ buffer: image.buffer, originalname: image.filename, mimetype: image.mimetype });

    await setStage(id, "saving", 90);
    let saved;
    try {
      saved = await insertPhotoFromBody({ body: v.body }, stored, v.fileId);
    } catch (error: any) {
      await discardUploadedFile(stored);
      stored = null;
      if (isDupEntry(error) && dupKey(error) === "uq_photos_drive_file_id") return await failJob(id, "Already uploaded.", "drive_url");
      if (isDupEntry(error) && dupKey(error) === "slug") return await failJob(id, `Slug "${v.slug}" is already used by another photo.`, "slug");
      throw error;
    }

    await pool.query(
      `UPDATE bulk_upload_jobs SET status = 'done', stage = 'done', progress = 100, photo_slug = ?, finished_at = NOW() WHERE id = ?`,
      [saved.slug, id]
    );
  } catch (error) {
    console.error(`Bulk upload job ${id} failed:`, error);
    if (stored) await discardUploadedFile(stored);
    await failJob(id, failureMessage(error)).catch(e => console.error("Could not mark job failed:", e));
  }
};

/** Starts jobs until CONCURRENCY are running or the queue is empty. */
const tick = async () => {
  if (ticking) return;
  ticking = true;
  try {
    while (activeJobs < CONCURRENCY) {
      const job = await claimJob();
      if (!job) break;
      activeJobs++;
      processJob(job).finally(() => {
        activeJobs--;
        tick();
      });
    }
  } catch (error) {
    console.error("Bulk upload worker error:", error);
  } finally {
    ticking = false;
  }
};

/** Wakes the worker right away (after queueing) instead of waiting for the next poll. */
const kickWorker = () => {
  if (workerStarted) tick();
};

/**
 * Called once at server start. Jobs left 'processing' by a previous run (the
 * server stopped mid-upload) go back to the queue, then the queue is polled.
 * Assumes a single server process, as this app runs today.
 */
export const startBulkUploadWorker = async () => {
  if (workerStarted) return;
  workerStarted = true;
  try {
    const [r] = await pool.query<any>(
      "UPDATE bulk_upload_jobs SET status = 'queued', stage = 'queued', progress = 0 WHERE status = 'processing'"
    );
    if (r.affectedRows) console.log(`Bulk upload: re-queued ${r.affectedRows} interrupted job(s).`);
  } catch (error) {
    console.error("Bulk upload worker could not recover jobs:", error);
  }
  setInterval(tick, POLL_MS);
  tick();
};

export default {
  getBulkUploadPage,
  saveBulkDraft,
  checkBulkLink,
  queueBulkJobs,
  getBulkJobs,
  dismissBulkJobs,
};
