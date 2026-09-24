import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

interface DBCategoryRow extends RowDataPacket {
  id: number;
  title: string;
  parent: string;
  description: string;
}

const getCategories = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limit = 8;
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBCategoryRow[]>(
      "SELECT id, name AS title, parent, description FROM categories ORDER BY id DESC"
    );

    const [photoRows] = await pool.query<RowDataPacket[]>(
      "SELECT category_id FROM photos WHERE live = 1"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(c =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.parent || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    }

    const totalItems = allRows.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const pageCategories = allRows.slice(offset, offset + limit);

    res.render("categories", {
      nav: "categories",
      photos: photoRows,
      categories: pageCategories,
      allCategories: allRows,
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
    console.error("Error fetching categories:", error);
    res.status(500).send("Error fetching categories");
  }
};

const createCategory = async (req: Request, res: Response) => {
  try {
    const title = (req.body.title || "").trim();
    const parent = req.body.parent || "None";
    const description = (req.body.description || "").trim();

    if (!title) {
      return res.redirect("/admin/categories?error=Category+title+is+required.");
    }

    await pool.query(
      "INSERT INTO categories (name, parent, description) VALUES (?, ?, ?)",
      [title, parent, description]
    );

    res.redirect("/admin/categories?page=1&flash=Category+created");
  } catch (error: any) {
    console.error("Error creating category:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const title = (req.body.title || "").trim();
      return res.redirect("/admin/categories?error=A+category+named+%22" + encodeURIComponent(title) + "%22+already+exists.");
    }
    res.status(500).send("Error creating category");
  }
};

const updateCategory = async (req: Request, res: Response) => {
  try {
    const page = req.body.page || req.query.page || "1";
    const search = req.body.search || req.query.search || "";
    const searchParam = search ? "&search=" + encodeURIComponent(String(search)) : "";
    const [rows] = await pool.query<DBCategoryRow[]>(
      "SELECT id, name AS title, parent, description FROM categories ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetCategory = rows.find(r => r.id === id) || rows[id];

    if (!targetCategory) return res.status(404).send("Category not found");

    const title = (req.body.title || "").trim() || targetCategory.title;
    const parent = req.body.parent || "None";
    const description = (req.body.description || "").trim();

    await pool.query(
      "UPDATE categories SET name = ?, parent = ?, description = ? WHERE id = ?",
      [title, parent, description, targetCategory.id]
    );

    res.redirect("/admin/categories?page=" + page + searchParam + "&flash=Category+saved");
  } catch (error: any) {
    console.error("Error updating category:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const title = (req.body.title || "").trim();
      return res.redirect("/admin/categories?error=A+category+named+%22" + encodeURIComponent(title) + "%22+already+exists.");
    }
    res.status(500).send("Error updating category");
  }
};

const deleteCategory = async (req: Request, res: Response) => {
  try {
    const page = req.query.page || "1";
    const search = req.query.search || "";
    const searchParam = search ? "&search=" + encodeURIComponent(String(search)) : "";
    const [rows] = await pool.query<DBCategoryRow[]>(
      "SELECT id FROM categories ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetCategory = rows.find(r => r.id === id) || rows[id];

    if (targetCategory) {
      await pool.query("DELETE FROM categories WHERE id = ?", [targetCategory.id]);
    }

    res.redirect("/admin/categories?page=" + page + searchParam + "&flash=Category+deleted");
  } catch (error: any) {
    console.error("Error deleting category:", error);
    if (error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451)) {
      return res.redirect("/admin/categories?error=Cannot+delete+category+because+it+is+in+use+by+one+or+more+photos.");
    }
    res.status(500).send("Error deleting category");
  }
};

// ---- JSON API Endpoint -----------------------------------------------------

const getCategoriesAPI = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBCategoryRow[]>(
      "SELECT id, name AS title, parent, description FROM categories ORDER BY id DESC"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(c =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.parent || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    }

    res.json({ success: true, search, count: allRows.length, categories: allRows });
  } catch (error) {
    console.error("API error fetching categories:", error);
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
};

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesAPI
};
