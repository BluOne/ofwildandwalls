import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

interface DBLensRow extends RowDataPacket {
  id: number;
  brand: string | null;
  model: string;
  created_at?: string;
  updated_at?: string;
}

const getLenses = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limit = 8;
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBLensRow[]>(
      "SELECT id, brand, model, created_at, updated_at FROM lenses ORDER BY id DESC"
    );

    const [catRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name AS title, parent, description FROM categories ORDER BY id ASC"
    );

    const [collRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name AS title, name, description FROM collections ORDER BY id ASC"
    );

    const [camRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, brand, model FROM cameras ORDER BY id ASC"
    );

    const [photoRows] = await pool.query<RowDataPacket[]>(
      "SELECT lens_id FROM photos WHERE live = 1"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(l =>
        (l.brand || "").toLowerCase().includes(q) ||
        (l.model || "").toLowerCase().includes(q) ||
        `${l.brand || ""} ${l.model}`.toLowerCase().includes(q)
      );
    }

    const totalItems = allRows.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const pageLenses = allRows.slice(offset, offset + limit);

    res.render("lenses", {
      nav: "lenses",
      photos: photoRows,
      categories: catRows,
      collections: collRows,
      cameras: camRows,
      lenses: pageLenses,
      allLenses: allRows,
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
    console.error("Error fetching lenses:", error);
    res.status(500).send("Error fetching lenses");
  }
};

const createLens = async (req: Request, res: Response) => {
  try {
    const brand = (req.body.brand || "").trim();
    const model = (req.body.model || "").trim();

    if (!model) {
      return res.redirect("/admin/lenses?error=Lens+model+is+required.");
    }

    await pool.query(
      "INSERT INTO lenses (brand, model) VALUES (?, ?)",
      [brand || null, model]
    );

    res.redirect("/admin/lenses?page=1&flash=Lens+added");
  } catch (error: any) {
    console.error("Error creating lens:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const brand = (req.body.brand || "").trim();
      const model = (req.body.model || "").trim();
      const lensName = brand ? `${brand} ${model}` : model;
      return res.redirect(
        "/admin/lenses?error=Lens+%22" + encodeURIComponent(lensName) + "%22+already+exists."
      );
    }
    res.status(500).send("Error creating lens");
  }
};

const updateLens = async (req: Request, res: Response) => {
  try {
    const page = req.body.page || req.query.page || "1";
    const search = req.body.search || req.query.search || "";
    const searchParam = search ? "&search=" + encodeURIComponent(String(search)) : "";
    const [rows] = await pool.query<DBLensRow[]>(
      "SELECT id, brand, model FROM lenses ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetLens = rows.find(r => r.id === id) || rows[id];

    if (!targetLens) return res.status(404).send("Lens not found");

    const brand = (req.body.brand || "").trim();
    const model = (req.body.model || "").trim() || targetLens.model;

    await pool.query(
      "UPDATE lenses SET brand = ?, model = ? WHERE id = ?",
      [brand || null, model, targetLens.id]
    );

    res.redirect("/admin/lenses?page=" + page + searchParam + "&flash=Lens+saved");
  } catch (error: any) {
    console.error("Error updating lens:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const brand = (req.body.brand || "").trim();
      const model = (req.body.model || "").trim();
      const lensName = brand ? `${brand} ${model}` : model;
      return res.redirect(
        "/admin/lenses?error=Lens+%22" + encodeURIComponent(lensName) + "%22+already+exists."
      );
    }
    res.status(500).send("Error updating lens");
  }
};

const deleteLens = async (req: Request, res: Response) => {
  try {
    const page = req.query.page || "1";
    const search = req.query.search || "";
    const searchParam = search ? "&search=" + encodeURIComponent(String(search)) : "";
    const [rows] = await pool.query<DBLensRow[]>(
      "SELECT id FROM lenses ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetLens = rows.find(r => r.id === id) || rows[id];

    if (targetLens) {
      await pool.query("DELETE FROM lenses WHERE id = ?", [targetLens.id]);
    }

    res.redirect("/admin/lenses?page=" + page + searchParam + "&flash=Lens+deleted");
  } catch (error: any) {
    console.error("Error deleting lens:", error);
    if (error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451)) {
      return res.redirect("/admin/lenses?error=Cannot+delete+lens+because+it+is+in+use+by+one+or+more+photos.");
    }
    res.status(500).send("Error deleting lens");
  }
};

// ---- JSON API Endpoint -----------------------------------------------------

const getLensesAPI = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBLensRow[]>(
      "SELECT id, brand, model, created_at, updated_at FROM lenses ORDER BY id DESC"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(l =>
        (l.brand || "").toLowerCase().includes(q) ||
        (l.model || "").toLowerCase().includes(q) ||
        `${l.brand || ""} ${l.model}`.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, search, count: allRows.length, lenses: allRows });
  } catch (error) {
    console.error("API error fetching lenses:", error);
    res.status(500).json({ success: false, error: "Failed to fetch lenses" });
  }
};

export default {
  getLenses,
  createLens,
  updateLens,
  deleteLens,
  getLensesAPI
};
