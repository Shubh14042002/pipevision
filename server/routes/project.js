import express from 'express';
const router = express.Router();
import { authenticate, roles, authorizeProject, managePermissions } from "../middleware/auth.js";
router.use(authenticate);

import { 
  getProjects, 
  getProjectInfoByID, 
  createProject, 
  deleteProject, 
  deleteVideo, 
  addVideo, 
  updateProjectStatus, 
  addUserPermissionToProject, 
  deleteUserPermissionFromProject, 
  generatePipelineSections 
} from "../controllers/project.js";

// Use multer with diskStorage
import multer from 'multer';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const probeFile = promisify(execFile);
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.project._id}-video-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /\.(mp4|mov|webm)$/i.test(file.originalname) && ["video/mp4", "video/quicktime", "video/webm"].includes(file.mimetype))
});

// ---------- Endpoints ----------
router.get('/getprojects', getProjects);
router.post('/projectinfo', authorizeProject, getProjectInfoByID);
router.post('/createproject', roles("admin", "manager"), createProject);
router.post('/deleteproject', authorizeProject, roles("admin", "manager"), deleteProject);
router.post('/deletevideo', authorizeProject, roles("admin", "manager"), deleteVideo);
router.post('/addVideo', authorizeProject, roles("admin", "manager"), addVideo);
router.post('/updateStatus', authorizeProject, roles("admin", "manager"), updateProjectStatus);
router.post('/addPerm', authorizeProject, managePermissions, roles("admin", "manager"), addUserPermissionToProject);
router.post('/deletePerm', authorizeProject, managePermissions, roles("admin", "manager"), deleteUserPermissionFromProject);

// Local file upload endpoint:
router.post('/uploadVideo', roles("admin", "manager"), authorizeProject, upload.single('videoFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
      const { stdout } = await probeFile("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", req.file.path], { timeout: 15000, maxBuffer: 1024 * 1024 });
      const metadata = JSON.parse(stdout);
      if (!metadata.streams?.some(stream => stream.codec_type === "video") || !(Number(metadata.format?.duration) > 0)) throw new Error("Invalid video");
    } catch {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "Video could not be validated. Use a valid MP4, MOV, or WebM; the server requires FFprobe." });
    }
    const videoUrl = `/uploads/${req.file.filename}`;
    const localKey = req.file.filename;
    return res.json({ success: true, url: videoUrl, s3Key: localKey });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Upload failed' });
  }
});


// Explicit cleanup for an upload whose metadata could not be attached.
router.post('/discardUpload', roles("admin", "manager"), authorizeProject, async (req, res, next) => {
  const key = req.body.s3Key;
  if (typeof key !== "string" || path.basename(key) !== key || !key.startsWith(`${req.project._id}-video-`)) return res.status(400).json({ error: "Invalid upload key" });
  if (req.project.videos.some(v => v.s3Key === key)) return res.status(409).json({ error: "Upload is already attached" });
  try {
    await fs.promises.unlink(path.join(__dirname, '..', 'uploads', key)).catch(err => { if (err.code !== "ENOENT") throw err; });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Sections generation endpoint from shubh
router.post('/generate-sections', authorizeProject, roles("admin", "manager"), generatePipelineSections);

export default router;
