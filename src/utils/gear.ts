import { RowDataPacket } from "mysql2";
import pool from "../db";

type GearTable = "cameras" | "lenses";
interface GearRow extends RowDataPacket { id: number; brand: string | null; model: string | null }

const KNOWN_BRANDS: Record<string, string> = {
  sony: "Sony", fujifilm: "FUJIFILM", nikon: "Nikon", nikkor: "Nikon",
  canon: "Canon", sigma: "Sigma", hasselblad: "Hasselblad", tamron: "Tamron",
};

/** Lowercase, collapse spaces, drop a trailing "lens" so "… OSS lens" matches "… OSS". */
const key = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/\s+lens$/, "").trim();

const fullName = (r: GearRow) => `${r.brand ? r.brand + " " : ""}${r.model || ""}`;

/** Split "SONY ILCE-1M2" into the catalog's brand / model columns. */
const splitName = (name: string, table: GearTable): { brand: string; model: string } => {
  const clean = name.replace(/\s+/g, " ").replace(/\s+lens$/i, "").trim();
  const first = clean.split(" ")[0].toLowerCase();
  const brand = KNOWN_BRANDS[first];
  if (!brand) return { brand: table === "cameras" ? clean.split(" ")[0] : "", model: table === "cameras" ? clean.split(" ").slice(1).join(" ") || clean : clean };
  // NIKKOR is a model-line prefix, so keep it in the model.
  return { brand, model: first === "nikkor" ? clean : clean.split(" ").slice(1).join(" ") };
};

/**
 * Find the camera/lens id for a free-text name, creating the catalog entry
 * when it doesn't exist yet. `cache` is reused across rows of one import.
 */
export const resolveGearId = async (table: GearTable, name: unknown, cache: GearRow[]): Promise<number | null> => {
  const raw = String(name ?? "").trim();
  if (!raw) return null;
  const q = key(raw);
  const hit = cache.find((r) => key(fullName(r)) === q || key(r.model || "") === q);
  if (hit) return hit.id;

  const { brand, model } = splitName(raw, table);
  await pool.query(`INSERT IGNORE INTO ${table} (brand, model) VALUES (?, ?)`, [brand, model]);
  const [rows] = await pool.query<GearRow[]>(`SELECT id, brand, model FROM ${table} WHERE brand <=> ? AND model = ?`, [brand, model]);
  if (!rows[0]) return null;
  cache.push(rows[0]);
  return rows[0].id;
};
