import pool from "../db";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

interface DBCountryRow extends RowDataPacket {
  id: number;
  country: string;
  state: string | null;
  created_at?: string;
  updated_at?: string;
}

const getCountries = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limit = 8;
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBCountryRow[]>(
      "SELECT id, country, state, created_at, updated_at FROM countries ORDER BY country ASC, state ASC"
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
        (c.country || "").toLowerCase().includes(q) ||
        (c.state || "").toLowerCase().includes(q) ||
        `${c.country} ${c.state || ""}`.toLowerCase().includes(q)
      );
    }

    const totalItems = allRows.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const pageCountries = allRows.slice(offset, offset + limit);

    res.render("countries", {
      nav: "countries",
      photos: photoRows,
      categories: catRows,
      collections: collRows,
      countries: pageCountries,
      allCountries: allRows,
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
    console.error("Error fetching countries:", error);
    res.status(500).send("Error fetching countries");
  }
};

const createCountry = async (req: Request, res: Response) => {
  try {
    const country = (req.body.country || "").trim();
    const state = (req.body.state || "").trim();

    if (!country || !state) {
      return res.redirect("/admin/countries?error=Country+and+State%2FRegion+are+required.");
    }

    await pool.query(
      "INSERT INTO countries (country, state) VALUES (?, ?)",
      [country, state]
    );

    res.redirect("/admin/countries?page=1&flash=Country+added");
  } catch (error: any) {
    console.error("Error creating country:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const country = (req.body.country || "").trim();
      const state = (req.body.state || "").trim();
      const label = `${country} (${state})`;
      return res.redirect(
        "/admin/countries?error=%22" + encodeURIComponent(label) + "%22+already+exists."
      );
    }
    res.status(500).send("Error creating country");
  }
};

const updateCountry = async (req: Request, res: Response) => {
  try {
    const page = req.body.page || req.query.page || "1";
    const [rows] = await pool.query<DBCountryRow[]>(
      "SELECT id, country, state FROM countries ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetCountry = rows.find(r => r.id === id) || rows[id];

    if (!targetCountry) return res.status(404).send("Country not found");

    const country = (req.body.country || "").trim() || targetCountry.country;
    const state = (req.body.state || "").trim() || targetCountry.state;

    if (!country || !state) {
      return res.redirect("/admin/countries?page=" + page + "&error=Country+and+State%2FRegion+are+required.");
    }

    await pool.query(
      "UPDATE countries SET country = ?, state = ? WHERE id = ?",
      [country, state, targetCountry.id]
    );

    res.redirect("/admin/countries?page=" + page + "&flash=Country+saved");
  } catch (error: any) {
    console.error("Error updating country:", error);
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      const country = (req.body.country || "").trim();
      const state = (req.body.state || "").trim();
      const label = `${country} (${state})`;
      return res.redirect(
        "/admin/countries?error=%22" + encodeURIComponent(label) + "%22+already+exists."
      );
    }
    res.status(500).send("Error updating country");
  }
};

const deleteCountry = async (req: Request, res: Response) => {
  try {
    const page = req.query.page || "1";
    const [rows] = await pool.query<DBCountryRow[]>(
      "SELECT id FROM countries ORDER BY id ASC"
    );

    const id = parseInt(req.params.index, 10);
    const targetCountry = rows.find(r => r.id === id) || rows[id];

    if (targetCountry) {
      await pool.query("DELETE FROM countries WHERE id = ?", [targetCountry.id]);
    }

    res.redirect("/admin/countries?page=" + page + "&flash=Country+deleted");
  } catch (error: any) {
    console.error("Error deleting country:", error);
    if (error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451)) {
      return res.redirect("/admin/countries?error=Cannot+delete+country+because+it+is+in+use+by+one+or+more+photos.");
    }
    res.status(500).send("Error deleting country");
  }
};

// ---- JSON API Endpoint -----------------------------------------------------

const getCountriesAPI = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || req.query.q || "").trim();

    let [allRows] = await pool.query<DBCountryRow[]>(
      "SELECT id, country, state, created_at, updated_at FROM countries ORDER BY country ASC, state ASC"
    );

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(c =>
        (c.country || "").toLowerCase().includes(q) ||
        (c.state || "").toLowerCase().includes(q) ||
        `${c.country} ${c.state || ""}`.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, search, count: allRows.length, countries: allRows });
  } catch (error) {
    console.error("API error fetching countries:", error);
    res.status(500).json({ success: false, error: "Failed to fetch countries" });
  }
};

export default {
  getCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  getCountriesAPI
};
