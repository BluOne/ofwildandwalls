import axios from "axios";

// Biggest image we'll pull from Drive (matches what a camera JPEG/PNG can reach).
const MAX_BYTES = 60 * 1024 * 1024;

/**
 * The file id from any of Drive's share-link shapes, or "" if it isn't one:
 *   https://drive.google.com/file/d/<id>/view?usp=sharing
 *   https://drive.google.com/open?id=<id>
 *   https://drive.google.com/uc?id=<id>&export=download
 *   https://drive.usercontent.google.com/download?id=<id>
 */
export const driveFileId = (raw: string): string => {
  let url: URL;
  try {
    url = new URL(String(raw || "").trim());
  } catch {
    return "";
  }
  if (!/^https?:$/.test(url.protocol) || !/^(drive|docs|drive\.usercontent)\.google\.com$/.test(url.hostname)) return "";

  const fromPath = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/);
  const id = fromPath ? fromPath[1] : url.searchParams.get("id") || "";
  return /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : "";
};

/** JPEG / PNG / WebP by their magic bytes (Drive often says application/octet-stream). */
const sniffImageType = (buf: Buffer): string => {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "";
};

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type DriveResponse = { status: number; headers: Record<string, any> };

/** Turns a failed Drive response into an admin-readable Error (or null when it's fine). */
const driveStatusError = (res: DriveResponse): Error | null => {
  if (res.status === 404) return new Error("Drive file not found. Check the link.");
  if (res.status === 401 || res.status === 403) return new Error("Drive file is private. Share it as \"Anyone with the link\".");
  if (res.status >= 400) return new Error(`Google Drive returned an error (${res.status}).`);
  return null;
};

const notImageError = (res: DriveResponse): Error => {
  const isHtml = String(res.headers["content-type"] || "").includes("text/html");
  return new Error(isHtml
    ? "Drive returned a sign-in page instead of the image. Share it as \"Anyone with the link\"."
    : "The Drive file isn't a JPEG, PNG or WebP image.");
};

/** Drive's own file name when it sends one, so titles and S3 keys stay readable. */
const driveFilename = (res: DriveResponse, id: string, mimetype: string): string => {
  const disposition = String(res.headers["content-disposition"] || "");
  const named = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (named) {
    try { return decodeURIComponent(named[1]); } catch { return named[1]; }
  }
  return `drive-${id}.${EXT[mimetype] || "jpg"}`;
};

const driveRequest = (id: string) => ({
  url: "https://drive.usercontent.google.com/download",
  // confirm=t skips Drive's "can't scan this file for viruses" page for big files.
  params: { id, export: "download", confirm: "t" },
  maxRedirects: 5,
  validateStatus: () => true,
});

/**
 * Checks a Drive link without downloading the whole file: reads just the first
 * bytes to confirm it opens and is an image. Throws an admin-readable Error.
 */
export const probeDriveImage = async (link: string): Promise<{ id: string; mimetype: string; filename: string }> => {
  const id = driveFileId(link);
  if (!id) throw new Error("Not a Google Drive file link.");

  const res = await axios.request({ ...driveRequest(id), method: "GET", responseType: "stream", timeout: 30000 });
  const stream = res.data as NodeJS.ReadableStream & { destroy: () => void };

  try {
    const failed = driveStatusError(res);
    if (failed) throw failed;

    const head: Buffer = await new Promise((resolve, reject) => {
      let got = Buffer.alloc(0);
      stream.on("data", (chunk: Buffer) => {
        got = Buffer.concat([got, chunk]);
        if (got.length >= 16) resolve(got);
      });
      stream.on("end", () => resolve(got));
      stream.on("error", reject);
    });

    const mimetype = sniffImageType(head);
    if (!mimetype) throw notImageError(res);
    return { id, mimetype, filename: driveFilename(res, id, mimetype) };
  } finally {
    stream.destroy();
  }
};

/**
 * Downloads a publicly shared Drive image. Throws an Error with a message
 * that's safe to show the admin when the link is wrong, private or not an image.
 * onProgress gets bytes received and the total (0 when Drive doesn't say).
 */
export const downloadDriveImage = async (
  link: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ id: string; buffer: Buffer; mimetype: string; filename: string }> => {
  const id = driveFileId(link);
  if (!id) throw new Error("Not a Google Drive file link.");

  let res;
  try {
    res = await axios.request<ArrayBuffer>({
      ...driveRequest(id), method: "GET", responseType: "arraybuffer", timeout: 120000, maxContentLength: MAX_BYTES,
      onDownloadProgress: onProgress ? (e) => onProgress(e.loaded, e.total || 0) : undefined,
    });
  } catch (error: any) {
    if (/maxContentLength/.test(String(error?.message))) throw new Error("The Drive file is larger than 60 MB.");
    throw new Error("Couldn't reach Google Drive. Try again.");
  }

  const failed = driveStatusError(res);
  if (failed) throw failed;

  const buffer = Buffer.from(res.data);
  const mimetype = sniffImageType(buffer);
  if (!mimetype) throw notImageError(res);

  return { id, buffer, mimetype, filename: driveFilename(res, id, mimetype) };
};
