import pool from "../db";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

interface PasswordRow extends RowDataPacket {
  id: number;
  password_hash: string;
  role_name: string;
}

interface SignupBody {
  username?: string;
  role?: string;
  email?: string;
  password?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface RoleRow extends RowDataPacket {
  id: number;
  name: string;
}

const signup = async (
  req: Request<{}, {}, SignupBody>,
  res: Response
) => {
  try {
    const username = (req.body.username || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    const roleInput = (req.body.role || "admin").trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).render("signup", {
        error: "Username, email, and password are required."
      });
    }

    // Find role ID
    const [rows] = await pool.query<RoleRow[]>(
      "SELECT id, name FROM roles WHERE LOWER(name) = ?",
      [roleInput]
    );

    if (rows.length === 0) {
      return res.status(400).render("signup", {
        error: `Role "${roleInput}" does not exist.`
      });
    }

    const roleId = rows[0].id;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await pool.query(
      `INSERT INTO users (username, role_id, email, password_hash)
       VALUES (?, ?, ?, ?)`,
      [username, roleId, email, passwordHash]
    );

    // Signup successful
    return res.redirect("/admin/login");

  } catch (err: any) {
    console.error("Signup error:", err);

    // Handle MySQL duplicate key error
    if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
      return res.status(400).render("signup", {
        error: "Username or email is already registered."
      });
    }

    return res.status(500).render("signup", {
      error: "Something went wrong during signup. Please try again."
    });
  }
};


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
  signup,
  login,
  logout
};