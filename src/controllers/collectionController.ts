import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

interface DBCollectionRow extends RowDataPacket {
  id: number;
  title: string;
  name: string;
  description: string;
  cover_photo_id: number | null;
}

const getCollections = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limit = 8;
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBCollectionRow[]>(
      "SELECT id, name AS title, name, description, cover_photo_id FROM collections ORDER BY id DESC"
    );

    const [catRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name AS title, parent, description FROM categories ORDER BY id ASC"
    );

    const [photoRows] = await pool.query<RowDataPacket[]>(
      "SELECT collection_id FROM photos WHERE live = 1"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(c =>
        (c.title || c.name || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    }

    const totalItems = allRows.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const pageCollections = allRows.slice(offset, offset + limit);

    res.render("collections", {
      nav: "collections",
      photos: photoRows,
      categories: catRows,
      collections: pageCollections,
      allCollections: allRows,
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
    console.error("Error fetching collections:", error);
    res.status(500).send("Error fetching collections");
  }
};

const createCollection = async (req: Request, res: Response) => {
  try {
    const title = (req.body.title || req.body.name || "").trim();
    const description = (req.body.description || "").trim();

    if (!title) {
      return res.redirect("/admin/collections?error=Collection+title+is+required.");
    }

    await pool.query(
      "INSERT INTO collections (name, description) VALUES (?, ?)",
      [title, description]
    );

    res.redirect("/admin/collections?page=1&flash=Collection+created");
  } catch (error: any) {
    console.error("Error creating collection:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const title = (req.body.title || req.body.name || "").trim();
      return res.redirect("/admin/collections?error=A+collection+named+%22" + encodeURIComponent(title) + "%22+already+exists.");
    }
    res.status(500).send("Error creating collection");
  }
};

const updateCollection = async (req: Request, res: Response) => {
  try {
    const page = req.body.page || req.query.page || "1";
    const search = req.body.search || req.query.search || "";
    const searchParam = search ? "&search=" + encodeURIComponent(String(search)) : "";
    const [rows] = await pool.query<DBCollectionRow[]>(
      "SELECT id, name FROM collections ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetCollection = rows.find(r => r.id === id) || rows[id];

    if (!targetCollection) return res.status(404).send("Collection not found");

    const title = (req.body.title || req.body.name || "").trim() || targetCollection.name;
    const description = (req.body.description || "").trim();

    await pool.query(
      "UPDATE collections SET name = ?, description = ? WHERE id = ?",
      [title, description, targetCollection.id]
    );

    res.redirect("/admin/collections?page=" + page + searchParam + "&flash=Collection+saved");
  } catch (error: any) {
    console.error("Error updating collection:", error);
    res.status(500).send("Error updating collection");
  }
};

const deleteCollection = async (req: Request, res: Response) => {
  try {
    const page = req.query.page || "1";
    const search = req.query.search || "";
    const searchParam = search ? "&search=" + encodeURIComponent(String(search)) : "";
    const [rows] = await pool.query<DBCollectionRow[]>(
      "SELECT id FROM collections ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetCollection = rows.find(r => r.id === id) || rows[id];

    if (targetCollection) {
      await pool.query("DELETE FROM collections WHERE id = ?", [targetCollection.id]);
    }

    res.redirect("/admin/collections?page=" + page + searchParam + "&flash=Collection+deleted");
  } catch (error: any) {
    console.error("Error deleting collection:", error);
    if (error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451)) {
      return res.redirect("/admin/collections?error=Cannot+delete+collection+because+it+is+in+use+by+one+or+more+photos.");
    }
    res.status(500).send("Error deleting collection");
  }
};

// ---- JSON API Endpoint -----------------------------------------------------

const getCollectionsAPI = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBCollectionRow[]>(
      "SELECT id, name AS title, name, description, cover_photo_id FROM collections ORDER BY id DESC"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(c =>
        (c.title || c.name || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    }

    res.json({ success: true, search, count: allRows.length, collections: allRows });
  } catch (error) {
    console.error("API error fetching collections:", error);
    res.status(500).json({ success: false, error: "Failed to fetch collections" });
  }
};

export default {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionsAPI
};
