import pool from "../db";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

interface PasswordRow extends RowDataPacket {
  id: number;
  password_hash: string;
  role_name: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response
) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).render("login", {
        error: "Email and password are required."
      });
    }

    const [adminData] = await pool.query<PasswordRow[]>(
      `SELECT u.id, u.password_hash, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE LOWER(u.email) = ?`,
      [email]
    );

    if (adminData.length === 0) {
      return res.status(401).render("login", {
        error: "Invalid email or password."
      });
    }

    const user = adminData[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

    if (isPasswordCorrect) {
      req.session.userId = user.id;
      req.session.role = user.role_name;
      return res.redirect("/admin/photos");
    } else {
      return res.status(401).render("login", {
        error: "Invalid email or password."
      });
    }

  } catch (err: unknown) {
    console.error("Login error:", err);
    return res.status(500).render("login", {
      error: "Something went wrong during login. Please try again."
    });
  }
};

const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Could not log out.");
    }
    res.clearCookie("connect.sid");
    return res.redirect("/admin/login");
  });
};

export default {
  login,
  logout
};