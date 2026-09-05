import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  uploadDocument, getDocumentById, downloadDocument,
  getDocumentVersions, createDocumentVersion
} from "./documents.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();
router.use(authenticate);

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// POST /api/v1/documents/upload
router.post("/upload", upload.single("file"), uploadDocument);

// GET /api/v1/documents/:id
router.get("/:id", getDocumentById);

// GET /api/v1/documents/:id/download
router.get("/:id/download", downloadDocument);

// GET /api/v1/documents/:id/versions
router.get("/:id/versions", getDocumentVersions);

// POST /api/v1/documents/:id/versions
router.post("/:id/versions", upload.single("file"), createDocumentVersion);

export default router;
