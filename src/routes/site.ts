import { Router } from "express";
import siteController from "../controllers/siteController";

const router = Router();

// ── Rendered pages ────────────────────────────────────────────────────────────

router.get("/", siteController.getGallery);
// Flow and Grid are tabs on the same page now — old bookmarks/links to
// /grid still land somewhere sensible instead of 404ing.
router.get("/grid", (req, res) => res.redirect("/"));
router.get("/photo/:slug", siteController.getPhotoDetail);

// ── Site JSON APIs ────────────────────────────────────────────────────────────
//
//  GET /api/photos              — all live photos  (?view=flow|grid &category= &collection= &q=)
//  GET /api/photos/flow         — live photos visible in the Flow view
//  GET /api/photos/grid         — live photos visible in the Grid view
//  GET /api/photos/:slug        — single photo with full detail fields
//  GET /api/cameras             — camera menu groups for the site footer
//  GET /api/countries           — country/state menu groups (used by live photos) for the site footer
//  GET /api/years                — distinct years (from photos.date), used by live photos, for the site footer

// Note: /flow and /grid must be registered BEFORE /:slug so Express matches them first.
router.get("/api/photos/flow", siteController.getFlowAPI);
router.get("/api/photos/grid", siteController.getGridAPI);
router.get("/api/photos/:slug", siteController.getPhotoBySlugAPI);
router.get("/api/photos", siteController.getPhotosAPI);
router.get("/api/cameras", siteController.getCamerasAPI);
router.get("/api/lenses", siteController.getLensesAPI);
router.get("/api/categories", siteController.getCategoriesAPI);
router.get("/api/collections", siteController.getCollectionsAPI);
router.get("/api/countries", siteController.getCountriesAPI);
router.get("/api/years", siteController.getYearsAPI);

export default router;
