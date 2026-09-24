import { Router, type Request } from "express";
import { RowDataPacket } from "mysql2";
import authController from "../controllers/authController";
import categoryController from "../controllers/categoryController";
import collectionController from "../controllers/collectionController";
import cameraController from "../controllers/cameraController";
import countryController from "../controllers/countryController";
import lensController from "../controllers/lensController";
import photoController from "../controllers/photoController";
import authenticate from "../middleware/authenticate";
import upload from "../config/multer";

const router = Router();


router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/signup", (req, res) => {
  res.render("signup");
});

router.get("/", (req, res) => {
  res.redirect("/admin/login");
});

router.post("/submit-form", authController.signup);
router.post("/log-in", authController.login);
router.post("/logout", authController.logout);

// ---- Photos ----------------------------------------------------------------

router.get("/photos", authenticate, photoController.getPhotos);
router.get("/photos/new", authenticate, photoController.getNewPhotoForm);
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

// ---- Collections -----------------------------------------------------------

router.get("/collections", authenticate, collectionController.getCollections);
router.post("/collections", authenticate, collectionController.createCollection);
router.post("/collections/:index", authenticate, collectionController.updateCollection);
router.post("/collections/:index/delete", authenticate, collectionController.deleteCollection);

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

router.get("/api/photos", photoController.getPhotosAPI);
router.get("/api/photos/:slug", photoController.getPhotoBySlugAPI);

// ---- Category APIs --------------------------------------------------------

router.get("/api/categories", categoryController.getCategoriesAPI);

// ---- Collection APIs ------------------------------------------------------

router.get("/api/collections", collectionController.getCollectionsAPI);

// ---- Camera APIs ----------------------------------------------------------

router.get("/api/cameras", cameraController.getCamerasAPI);

// ---- Country APIs -----------------------------------------------------------

router.get("/api/countries", countryController.getCountriesAPI);

// ---- Lens APIs ------------------------------------------------------------

router.get("/api/lenses", lensController.getLensesAPI);

export default router;
