import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import MySQLSessionStore from "./config/sessionStore";

import siteRouter from "./routes/site";
import adminRouter from "./routes/admin";
import { imageBaseUrl } from "./utils/imageVariants";
import { startBulkUploadWorker } from "./controllers/bulkUploadController";

const app = express();

const PORT = process.env.PORT
    ? Number(process.env.PORT)
    : 3000;

app.set("view engine", "ejs");

// Image host (S3 or IMAGE_CDN_URL), preconnected in the site <head>.
app.locals.imageOrigin = imageBaseUrl();

app.set("views", [
    path.join(__dirname, "..", "views", "site"),
    path.join(__dirname, "..", "views", "admin")
]);

app.use(express.urlencoded({ extended: true }));
// 2 MB: a full Bulk upload draft (up to 1,000 grid rows) is sent as one JSON body.
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use(
    express.static(
        path.join(__dirname, "..", "public", "site")
    )
);

app.use(
    express.static(
        path.join(__dirname, "..", "public", "admin")
    )
);

app.use(
    session({
        secret: process.env.SESSION_SECRET!,
        // Kept in MySQL so a server restart doesn't log the admin out.
        store: new MySQLSessionStore(),
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
        }
    })
);

app.use("/", siteRouter);
app.use("/admin", adminRouter);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Of Wild & Walls running on port ${PORT}`);
    console.log(`Admin panel available at /admin/photos`);
    // Processes queued Bulk upload rows in the background.
    startBulkUploadWorker();
});