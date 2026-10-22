import express from "express";
const router = express.Router();
import { authenticate, authorizeProject } from "../middleware/auth.js";
router.use(authenticate);
import {
  generatePDF,
  // getReportData,
  // updateReportData,
} from "../controllers/reportController.js";

// 📌 Route to Generate the PDF Report
router.get("/generate-pdf/:projectId", authorizeProject, generatePDF);

// // 📌 Route to Fetch Report Data for Preview & Editing
// router.get("/get-report/:projectId", getReportData);

// // 📌 Route to Update Report Before Finalizing PDF
// router.post("/update-report/:projectId", updateReportData);

export default router;
