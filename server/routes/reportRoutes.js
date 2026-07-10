import express from "express";
const router = express.Router();
import {
  generatePDF,
  // getReportData,
  // updateReportData,
} from "../controllers/reportController.js";

// 📌 Route to Generate the PDF Report
router.get("/generate-pdf/:projectId", generatePDF);

// // 📌 Route to Fetch Report Data for Preview & Editing
// router.get("/get-report/:projectId", getReportData);

// // 📌 Route to Update Report Before Finalizing PDF
// router.post("/update-report/:projectId", updateReportData);

export default router;
