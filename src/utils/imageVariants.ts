import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3";

/** Widths of the resized WebP copies made for every photo. */
export const VARIANT_WIDTHS = [320, 480, 960, 1600];

/** Long cache: every S3 key is unique (timestamped), so it never changes. */
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export interface ImageVariantInfo {
  variant_base: string;
  variant_widths: string;
  img_width: number | null;
  img_height: number | null;
  img_color: string | null;
}

/**
 * Public base URL for objects in the photo bucket. Set IMAGE_CDN_URL
 * (e.g. a CloudFront domain) to serve images through a CDN instead of
 * straight from S3.
 */
export const imageBaseUrl = (): string => {
  const cdn = (process.env.IMAGE_CDN_URL || "").replace(/\/+$/, "");
  if (cdn) return cdn;
  const bucket = process.env.AWS_S3_BUCKET_NAME || "";
  const region = process.env.AWS_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com`;
};

export const s3KeyUrl = (key: string): string => `${imageBaseUrl()}/${key}`;

/** Upload one object to the photo bucket with the long cache header. */
export const putImage = async (key: string, body: Buffer, contentType: string) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE,
    }),
  );
};

const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/**
 * Makes resized WebP copies of `buffer` and uploads them next to the
 * original as `${base}-<width>.webp`. Widths larger than the original are
 * skipped (the original's own width is used instead, so there is always
 * at least one copy). Also returns the original's size and dominant colour.
 */
export const createImageVariants = async (buffer: Buffer, base: string): Promise<ImageVariantInfo> => {
  // .rotate() applies the EXIF orientation, so width/height match what the
  // browser displays.
  const source = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await source.metadata();

  let width = meta.width || null;
  let height = meta.height || null;

  // Orientations 5–8 swap width and height once rotated.
  if (width && height && meta.orientation && meta.orientation >= 5) {
    [width, height] = [height, width];
  }

  let widths = VARIANT_WIDTHS.filter((w) => !width || w < width);
  if (widths.length === 0 && width) widths = [width];
  if (widths.length === 0) widths = [VARIANT_WIDTHS[0]];

  await Promise.all(
    widths.map(async (w) => {
      const out = await source
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 75, effort: 5 })
        .toBuffer();
      await putImage(`${base}-${w}.webp`, out, "image/webp");
    }),
  );

  let color: string | null = null;
  try {
    const { dominant } = await source.clone().stats();
    color = `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`;
  } catch {
    color = null;
  }

  return {
    variant_base: base,
    variant_widths: widths.join(","),
    img_width: width,
    img_height: height,
    img_color: color,
  };
};

/** S3 key prefix for a photo's variants, derived from its original key. */
export const variantBaseFor = (originalKey: string): string =>
  `variants/${originalKey.replace(/^photos\//, "").replace(/\.[^./]+$/, "")}`;

export interface SiteImageFields {
  srcset: string;
  srcSmall: string;
  srcLarge: string;
  width: number;
  height: number;
  color: string;
}

/**
 * srcset / sized URLs for the site views. Falls back to the original
 * `src` for photos that have no variants yet (not backfilled).
 */
export const siteImageFields = (
  row: { variant_base?: string | null; variant_widths?: string | null; img_width?: number | null; img_height?: number | null; img_color?: string | null },
  src: string,
): SiteImageFields => {
  const widths = String(row.variant_widths || "")
    .split(",")
    .map((w) => parseInt(w, 10))
    .filter((w) => w > 0)
    .sort((a, b) => a - b);

  const fields: SiteImageFields = {
    srcset: "",
    srcSmall: src,
    srcLarge: src,
    width: row.img_width || 0,
    height: row.img_height || 0,
    color: row.img_color || "",
  };

  if (!row.variant_base || widths.length === 0) return fields;

  const url = (w: number) => s3KeyUrl(`${row.variant_base}-${w}.webp`);
  fields.srcset = widths.map((w) => `${url(w)} ${w}w`).join(", ");
  fields.srcSmall = url(widths[0]);
  fields.srcLarge = url(widths[widths.length - 1]);
  return fields;
};

/**
 * Rewrites a stored S3 URL to IMAGE_CDN_URL when a CDN is configured, so
 * rows saved before the CDN existed are served through it too.
 */
export const cdnUrl = (url: string): string => {
  const cdn = (process.env.IMAGE_CDN_URL || "").replace(/\/+$/, "");
  if (!cdn || !url) return url;
  const bucket = process.env.AWS_S3_BUCKET_NAME || "";
  const region = process.env.AWS_REGION || "us-east-1";
  const s3Base = `https://${bucket}.s3.${region}.amazonaws.com/`;
  return url.startsWith(s3Base) ? `${cdn}/${url.slice(s3Base.length)}` : url;
};

/**
 * Best-effort variant generation for the admin upload paths: a failure is
 * logged and the photo is saved without variants (the site then falls
 * back to the original; the backfill script can retry later).
 */
export const tryCreateImageVariants = async (buffer: Buffer, originalKey: string): Promise<ImageVariantInfo | null> => {
  try {
    return await createImageVariants(buffer, variantBaseFor(originalKey));
  } catch (err) {
    console.error(`Image variants failed for ${originalKey}:`, err);
    return null;
  }
};
