/**
 * Creates resized WebP variants for photos that don't have them yet.
 *
 *   npm run backfill:variants          # only photos missing variants
 *   npm run backfill:variants -- --all # regenerate every photo
 *
 * In the Docker image (no tsx): node dist/scripts/backfillVariants.js
 */
import axios from "axios";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { RowDataPacket } from "mysql2";
import pool from "../db";
import s3 from "../config/s3";
import { createImageVariants, s3KeyUrl, variantBaseFor } from "../utils/imageVariants";

interface Row extends RowDataPacket {
  id: number;
  slug: string;
  url: string | null;
  s3_key: string | null;
}

const CONCURRENCY = 3;

const download = async (row: Row): Promise<Buffer> => {
  const key = row.s3_key || "";

  if (key && !key.startsWith("http")) {
    try {
      const out = await s3.send(
        new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key }),
      );
      const bytes = await out.Body!.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      // The upload key may only be allowed to write (no s3:GetObject);
      // the bucket is publicly readable, so fetch it like a browser would.
    }
  }

  const url = row.url || (key.startsWith("http") ? key : s3KeyUrl(key));
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  return Buffer.from(res.data);
};

// Variants are named after the original's key; photos added by URL only
// get a key derived from their id.
const baseFor = (row: Row): string => {
  const key = row.s3_key && !row.s3_key.startsWith("http") ? row.s3_key : `photos/${row.id}-${row.slug || "photo"}`;
  return variantBaseFor(key);
};

const main = async () => {
  const all = process.argv.includes("--all");
  const [rows] = await pool.query<Row[]>(
    `SELECT id, slug, url, s3_key FROM photos
     WHERE (url IS NOT NULL AND url <> '' OR s3_key IS NOT NULL AND s3_key <> '')
     ${all ? "" : "AND (variant_base IS NULL OR variant_base = '')"}
     ORDER BY id DESC`,
  );

  console.log(`${rows.length} photo(s) to process`);

  let done = 0;
  let failed = 0;
  let next = 0;

  const worker = async () => {
    while (next < rows.length) {
      const row = rows[next++];
      try {
        const buffer = await download(row);
        const v = await createImageVariants(buffer, baseFor(row));
        await pool.query(
          `UPDATE photos SET variant_base = ?, variant_widths = ?, img_width = ?, img_height = ?, img_color = ? WHERE id = ?`,
          [v.variant_base, v.variant_widths, v.img_width, v.img_height, v.img_color, row.id],
        );
        done++;
        console.log(`ok   #${row.id} ${row.slug} (${v.variant_widths})`);
      } catch (err: any) {
        failed++;
        console.error(`fail #${row.id} ${row.slug}: ${err?.message || err}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done: ${done} ok, ${failed} failed`);
  await pool.end();
};

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
