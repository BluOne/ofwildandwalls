import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";

import siteRouter from "./routes/site";
import adminRouter from "./routes/admin";

const app = express();

const PORT = process.env.PORT
    ? Number(process.env.PORT)
    : 3000;

app.set("view engine", "ejs");

app.set("views", [
    path.join(__dirname, "..", "views", "site"),
    path.join(__dirname, "..", "views", "admin")
]);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 60 * 60 * 1000
        }
    })
);

app.use("/", siteRouter);
app.use("/admin", adminRouter);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Of Wild & Walls running on port ${PORT}`);
    console.log(`Admin panel available at /admin/photos`);
});