// routes/detection.js
import express from "express";
import { detectDefects, getDetectionResults,saveDetectionResults } from "../controllers/detection.js";

const router = express.Router();

router.post("/", detectDefects); // Endpoint for defect detection
router.post("/saveResults", saveDetectionResults); // Endpoint for saving detection results
router.get("/results", getDetectionResults); // Retrieve stored detection results

export default router;
