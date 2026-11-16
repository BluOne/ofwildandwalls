import { Router, type Request } from "express";
import { RowDataPacket } from "mysql2";
import authController from "../controllers/authController";
import categoryController from "../controllers/categoryController";
import collectionController from "../controllers/collectionController";
import cameraController from "../controllers/cameraController";
import countryController from "../controllers/countryController";
import lensController from "../controllers/lensController";
import photoController from "../controllers/photoController";
import bulkUploadController from "../controllers/bulkUploadController";
import authenticate from "../middleware/authenticate";
import upload from "../config/multer";

const router = Router();


router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/", (req, res) => {
  res.redirect("/admin/login");
});

router.post("/log-in", authController.login);
router.post("/logout", authController.logout);

// ---- Photos ----------------------------------------------------------------

router.get("/photos", authenticate, photoController.getPhotos);
router.get("/photos/new", authenticate, photoController.getNewPhotoForm);

// Bulk upload (before /photos/:slug so "bulk" isn't taken for a slug)
router.get("/photos/bulk", authenticate, bulkUploadController.getBulkUploadPage);
router.put("/photos/bulk/draft", authenticate, bulkUploadController.saveBulkDraft);
router.post("/photos/bulk/check", authenticate, bulkUploadController.checkBulkLink);
router.post("/photos/bulk/jobs", authenticate, bulkUploadController.queueBulkJobs);
router.get("/photos/bulk/jobs", authenticate, bulkUploadController.getBulkJobs);
router.post("/photos/bulk/jobs/dismiss", authenticate, bulkUploadController.dismissBulkJobs);
router.get("/photos/:slug/edit", authenticate, photoController.getEditPhotoForm);

router.post("/photos", authenticate, upload.single("photo"), photoController.createPhoto);
router.post("/photos/:slug", authenticate, upload.single("photo"), photoController.updatePhoto);
router.post("/photos/:slug/toggle", authenticate, photoController.togglePhoto);
router.post("/photos/:slug/delete", authenticate, photoController.deletePhoto);

// ---- Categories ------------------------------------------------------------

router.get("/categories", authenticate, categoryController.getCategories);
router.post("/categories", authenticate, categoryController.createCategory);
router.post("/categories/:index", authenticate, categoryController.updateCategory);
router.post("/categories/:index/delete", authenticate, categoryController.deleteCategory);
router.post("/categories/:index/toggle", authenticate, categoryController.toggleCategory);

// ---- Collections -----------------------------------------------------------

router.get("/collections", authenticate, collectionController.getCollections);
router.post("/collections", authenticate, collectionController.createCollection);
router.post("/collections/:index", authenticate, collectionController.updateCollection);
router.post("/collections/:index/delete", authenticate, collectionController.deleteCollection);
router.post("/collections/:index/toggle", authenticate, collectionController.toggleCollection);

// ---- Cameras ---------------------------------------------------------------

router.get("/cameras", authenticate, cameraController.getCameras);
router.post("/cameras", authenticate, cameraController.createCamera);
router.post("/cameras/:index", authenticate, cameraController.updateCamera);
router.post("/cameras/:index/delete", authenticate, cameraController.deleteCamera);

// ---- Countries --------------------------------------------------------------

router.get("/countries", authenticate, countryController.getCountries);
router.post("/countries", authenticate, countryController.createCountry);
router.post("/countries/:index", authenticate, countryController.updateCountry);
router.post("/countries/:index/delete", authenticate, countryController.deleteCountry);

// ---- Lenses ----------------------------------------------------------------

router.get("/lenses", authenticate, lensController.getLenses);
router.post("/lenses", authenticate, lensController.createLens);
router.post("/lenses/:index", authenticate, lensController.updateLens);
router.post("/lenses/:index/delete", authenticate, lensController.deleteLens);

// ---- Photo APIs -----------------------------------------------------------

// These return unpublished photos, categories and collections too, so they
// are for signed-in admins only. The public site uses /api/* (siteController).
router.get("/api/photos", authenticate, photoController.getPhotosAPI);
router.get("/api/photos/:slug", authenticate, photoController.getPhotoBySlugAPI);

// ---- Category APIs --------------------------------------------------------

router.get("/api/categories", authenticate, categoryController.getCategoriesAPI);

// ---- Collection APIs ------------------------------------------------------

router.get("/api/collections", authenticate, collectionController.getCollectionsAPI);

// ---- Camera APIs ----------------------------------------------------------

router.get("/api/cameras", authenticate, cameraController.getCamerasAPI);

// ---- Country APIs -----------------------------------------------------------

router.get("/api/countries", authenticate, countryController.getCountriesAPI);

// ---- Lens APIs ------------------------------------------------------------

router.get("/api/lenses", authenticate, lensController.getLensesAPI);

export default router;
