// // /server/routes/project.js
// import express from 'express';
// const router = express.Router();

// // Import controllers from our unified controller file
// import { 
//   getProjects, 
//   getProjectInfoByID, 
//   createProject, 
//   deleteProject, 
//   deleteVideo, 
//   addVideo, 
//   updateProjectStatus, 
//   addUserPermissionToProject, 
//   deleteUserPermissionFromProject, 
//   // addMultipleVideos, 
//   generatePipelineSections 
// } from "../controllers/project.js";

// // S3 Upload configuration using multer-s3 (from main branch)
// import multer from 'multer';
// import multerS3 from 'multer-s3';
// import s3 from '../config/s3.js';

// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.S3_BUCKET_NAME,
//     // Optionally set acl: 'public-read' if your bucket settings allow it.
//     // acl: 'public-read',
//     key: (req, file, cb) => {
//       // Create a unique file name – e.g. "videos/video-<timestamp>-<random>.<ext>"
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//       const ext = file.originalname.split('.').pop();
//       cb(null, `videos/video-${uniqueSuffix}.${ext}`);
//     },
//   }),
// });

// // ---------- Main Branch Endpoints ----------
// router.get('/getprojects', getProjects);
// router.post('/projectinfo', getProjectInfoByID);
// router.post('/createproject', createProject);
// router.post('/deleteproject', deleteProject);
// router.post('/deletevideo', deleteVideo);
// router.post('/addVideo', addVideo);
// router.post('/updateStatus', updateProjectStatus);
// router.post('/addPerm', addUserPermissionToProject);
// router.post('/deletePerm', deleteUserPermissionFromProject);

// // S3 upload endpoint – returns S3 URL and object key.
// router.post('/uploadVideo', upload.single('videoFile'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }
//     // Multer-S3 provides the final URL and key.
//     const videoUrl = req.file.location;
//     const s3Key = req.file.key;
//     return res.json({ success: true, url: videoUrl, key: s3Key });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: 'Upload failed' });
//   }
// });

// // ---------- Shubh Branch Endpoints ----------
// // router.post('/addMultipleVideos', addMultipleVideos);
// router.post('/generate-sections', generatePipelineSections);

// export default router;


import express from 'express';
const router = express.Router();

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
    cb(null, `video-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

// ---------- Endpoints ----------
router.get('/getprojects', getProjects);
router.post('/projectinfo', getProjectInfoByID);
router.post('/createproject', createProject);
router.post('/deleteproject', deleteProject);
router.post('/deletevideo', deleteVideo);
router.post('/addVideo', addVideo);
router.post('/updateStatus', updateProjectStatus);
router.post('/addPerm', addUserPermissionToProject);
router.post('/deletePerm', deleteUserPermissionFromProject);

// Local file upload endpoint:
router.post('/uploadVideo', upload.single('videoFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Build the full URL using the request's protocol and host.
    const videoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const localKey = req.file.filename;
    return res.json({ success: true, url: videoUrl, s3Key: localKey });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Upload failed' });
  }
});


// Sections generation endpoint from shubh
router.post('/generate-sections', generatePipelineSections);

export default router;
