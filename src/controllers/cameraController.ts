import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

interface DBCameraRow extends RowDataPacket {
  id: number;
  brand: string;
  model: string;
  created_at?: string;
  updated_at?: string;
}

const getCameras = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limit = 8;
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBCameraRow[]>(
      "SELECT id, brand, model, created_at, updated_at FROM cameras ORDER BY id DESC"
    );

    const [catRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name AS title, parent, description FROM categories ORDER BY id ASC"
    );

    const [collRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name AS title, name, description FROM collections ORDER BY id ASC"
    );

    const [photoRows] = await pool.query<RowDataPacket[]>(
      "SELECT camera_id FROM photos WHERE live = 1"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(c =>
        (c.brand || "").toLowerCase().includes(q) ||
        (c.model || "").toLowerCase().includes(q) ||
        `${c.brand} ${c.model}`.toLowerCase().includes(q)
      );
    }

    const totalItems = allRows.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const pageCameras = allRows.slice(offset, offset + limit);

    res.render("cameras", {
      nav: "cameras",
      photos: photoRows,
      categories: catRows,
      collections: collRows,
      cameras: pageCameras,
      allCameras: allRows,
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
    console.error("Error fetching cameras:", error);
    res.status(500).send("Error fetching cameras");
  }
};

const createCamera = async (req: Request, res: Response) => {
  try {
    const brand = (req.body.brand || "").trim();
    const model = (req.body.model || "").trim();

    if (!brand || !model) {
      return res.redirect("/admin/cameras?error=Brand+and+Model+are+required.");
    }

    await pool.query(
      "INSERT INTO cameras (brand, model) VALUES (?, ?)",
      [brand, model]
    );

    res.redirect("/admin/cameras?page=1&flash=Camera+added");
  } catch (error: any) {
    console.error("Error creating camera:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const brand = (req.body.brand || "").trim();
      const model = (req.body.model || "").trim();
      return res.redirect(
        "/admin/cameras?error=Camera+%22" + encodeURIComponent(brand + " " + model) + "%22+already+exists."
      );
    }
    res.status(500).send("Error creating camera");
  }
};

const updateCamera = async (req: Request, res: Response) => {
  try {
    const page = req.body.page || req.query.page || "1";
    const search = req.body.search || req.query.search || "";
    const searchParam = search ? "&search=" + encodeURIComponent(String(search)) : "";
    const [rows] = await pool.query<DBCameraRow[]>(
      "SELECT id, brand, model FROM cameras ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetCamera = rows.find(r => r.id === id) || rows[id];

    if (!targetCamera) return res.status(404).send("Camera not found");

    const brand = (req.body.brand || "").trim() || targetCamera.brand;
    const model = (req.body.model || "").trim() || targetCamera.model;

    await pool.query(
      "UPDATE cameras SET brand = ?, model = ? WHERE id = ?",
      [brand, model, targetCamera.id]
    );

    res.redirect("/admin/cameras?page=" + page + searchParam + "&flash=Camera+saved");
  } catch (error: any) {
    console.error("Error updating camera:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const brand = (req.body.brand || "").trim();
      const model = (req.body.model || "").trim();
      return res.redirect(
        "/admin/cameras?error=Camera+%22" + encodeURIComponent(brand + " " + model) + "%22+already+exists."
      );
    }
    res.status(500).send("Error updating camera");
  }
};

const deleteCamera = async (req: Request, res: Response) => {
  try {
    const page = req.query.page || "1";
    const search = req.query.search || "";
    const searchParam = search ? "&search=" + encodeURIComponent(String(search)) : "";
    const [rows] = await pool.query<DBCameraRow[]>(
      "SELECT id FROM cameras ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetCamera = rows.find(r => r.id === id) || rows[id];

    if (targetCamera) {
      await pool.query("DELETE FROM cameras WHERE id = ?", [targetCamera.id]);
    }

    res.redirect("/admin/cameras?page=" + page + searchParam + "&flash=Camera+deleted");
  } catch (error: any) {
    console.error("Error deleting camera:", error);
    if (error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451)) {
      return res.redirect("/admin/cameras?error=Cannot+delete+camera+because+it+is+in+use+by+one+or+more+photos.");
    }
    res.status(500).send("Error deleting camera");
  }
};

// ---- JSON API Endpoint -----------------------------------------------------

const getCamerasAPI = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBCameraRow[]>(
      "SELECT id, brand, model, created_at, updated_at FROM cameras ORDER BY id DESC"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(c =>
        (c.brand || "").toLowerCase().includes(q) ||
        (c.model || "").toLowerCase().includes(q) ||
        `${c.brand} ${c.model}`.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, search, count: allRows.length, cameras: allRows });
  } catch (error) {
    console.error("API error fetching cameras:", error);
    res.status(500).json({ success: false, error: "Failed to fetch cameras" });
  }
};

export default {
  getCameras,
  createCamera,
  updateCamera,
  deleteCamera,
  getCamerasAPI
};
