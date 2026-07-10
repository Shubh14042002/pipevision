// import multer from "multer";
// import path from "path";
// import { fileURLToPath } from "url";
// import fs from "fs";
// import Project from "../models/Project.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Multer setup for local file storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadPath = path.join(__dirname, "..", "videos");
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const upload = multer({ storage }).single("video");

// export const uploadVideo = async (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) {
//       console.error("❌ Error uploading video:", err);
//       return res.status(500).json({ error: "Failed to upload video." });
//     }

//     const { projectId, title, notes, url } = req.body;

//     let videoUrl;
//     if (req.file) {
//       // Local file upload
//       videoUrl = `/videos/${req.file.filename}`;
//     } else if (url) {
//       // YouTube or direct URL
//       videoUrl = url;
//     } else {
//       return res.status(400).json({ error: "No video source provided." });
//     }

//     try {
//       const project = await Project.findById(projectId);
//       if (!project) return res.status(404).json({ error: "Project not found" });

//       const newVideo = { title, notes, url: videoUrl, _id: Date.now().toString() };
//       project.videos.push(newVideo);
//       await project.save();

//       res.status(200).json({ message: "Video uploaded successfully", videoUrl });
//     } catch (error) {
//       console.error("❌ Error saving video:", error);
//       res.status(500).json({ error: "Failed to save video data" });
//     }
//   });
// };
