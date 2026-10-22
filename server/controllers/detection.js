// server/controllers/detection.js
import fs, { promises as fsPromises } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import Project from "../models/Project.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonFilePath = path.join(__dirname, "..", "data", "dent.json");

const findKeyDefects = (detections) => {
    let defects = [];
    let currentDefect = [];
    
    for (let i = 0; i < detections.length; i++) {
        const detection = detections[i];
        const prevDetection = currentDefect.length > 0 ? currentDefect[currentDefect.length - 1] : null;

        if (prevDetection) {
            const confidenceDrop = prevDetection.confidence - detection.confidence;
            const frameGap = detection.frame - prevDetection.frame;

            if (confidenceDrop > 0.30 || frameGap > 1) {
                const bestFrame = currentDefect.reduce((max, d) => (d.confidence > max.confidence ? d : max), currentDefect[0]);
                defects.push(bestFrame);
                currentDefect = [];
            }
        }
        currentDefect.push(detection);
    }
    if (currentDefect.length > 0) {
        const bestFrame = currentDefect.reduce((max, d) => (d.confidence > max.confidence ? d : max), currentDefect[0]);
        defects.push(bestFrame);
    }
    return defects;
};

const extractFrames = async (videoPath, keyDefects, videoId) => {
    const framesDir = path.join(__dirname, "..", "frames");
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }
  
    let extractedFrames = [];
    for (const defect of keyDefects) {
      const frameFilename = `${videoId}_frame_${defect.frame}.jpg`;
      const framePath = path.join(framesDir, frameFilename);
  
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath, { timeout: 60 })
          .seekInput((defect.frame / 30).toFixed(2))
          .frames(1)
          .outputOptions(
            "-max_muxing_queue_size", "1024",
            "-qscale:v", "2",
            "-pix_fmt", "yuvj420p"
          )
          .output(framePath)
          .on("end", () => {
            extractedFrames.push({
              frameNumber: defect.frame,
              defectType: "Unknown Defect",
              confidence: defect.confidence,
              framePath: `/frames/${frameFilename}`
            });
            resolve();
          })
          .on("error", (err, stdout, stderr) => {
            console.error("ffmpeg error:", err);
            console.error("ffmpeg stderr:", stderr);
            reject(err);
          })
          .run();
      });
    }
    return extractedFrames;
  };
  

const detectDefects = async (req, res) => {
    const { projectId, videoId, assignedSections } = req.body;

    if (!projectId || !videoId) {
        return res.status(400).json({ error: "Missing projectId or videoId" });
    }

    try {
        
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found." });

        const videoIndex = project.videos.findIndex(v => v._id.toString() === videoId);
        if (videoIndex === -1) return res.status(404).json({ error: "Video not found in project." });

        let video = project.videos[videoIndex];

        // 🔥 **Fix: Ensure assignedSections is an array of strings**

        // ✅ Store assigned sections in the video
        project.videos[videoIndex].assignedSections = Array.isArray(assignedSections) ? assignedSections.map(String) : [];

        
        // 📥 **Read mock detection results from `dent.json`**
        const jsonContent = await fsPromises.readFile(jsonFilePath, "utf8");
        const detections = JSON.parse(jsonContent).detections;

        // 🔍 **Process detected defects**
        const keyDefects = findKeyDefects(detections);

        const defectTypeMapping = {
            1: "Dent",
            2: "Service Crack",
            // Add additional mappings if needed
        };

        const detectedDefects = keyDefects.map((defect, index) => ({
            frameNumber: defect.frame,
            defectType: defect.class_id && defectTypeMapping[defect.class_id] ? defectTypeMapping[defect.class_id] : "Unknown",
            confidence: defect.confidence,
            framePath: path.join("server", "frames", `${videoId}_frame_${defect.frame}.jpg`),
            from: video.assignedSections.length > 0 ? video.assignedSections[0].split("-")[0].trim() : "Unknown",
            to: video.assignedSections.length > 0 ? (video.assignedSections[0].split("-")[1] || "Unknown").trim() : "Unknown",
            chainage: "0m",
            videoId: videoId,
          }));

        
        // 📸 **Extract frames for detected defects**
        const mediaPath = new URL(video.url, "http://local").pathname;
        const filename = path.basename(mediaPath);
        if (!mediaPath.startsWith("/uploads/") || !/^[a-zA-Z0-9_.-]+$/.test(filename)) return res.status(400).json({ error: "Reupload this video to use sample detection" });
        const videoPath = path.join(__dirname, "..", "uploads", filename);
        if (!fs.existsSync(videoPath)) return res.status(404).json({ error: "Video file unavailable; reupload the video" });
        const extractedFrames = await extractFrames(videoPath, keyDefects, videoId);
        // 🛠 **Update the project with defect detection results**
        project.videos[videoIndex].defectCount = detectedDefects.length;
        project.videos[videoIndex].detectionResults = detectedDefects.map((d, i) => ({ ...d, framePath: extractedFrames[i].framePath }));
        project.videos[videoIndex].detectionCompleted = true; // ✅ Indicate detection is completed
        await project.save();

        res.status(200).json({ message: "Sample/mock detection completed", sample: true, detectedDefects: project.videos[videoIndex].detectionResults });
    } catch (error) {
        console.error("❌ Error processing defect detection:", error);
        res.status(500).json({ error: "Failed to process defect detection" });
    }
};


export { detectDefects };


// 📌 **Step 5: Retrieve detection results from MongoDB**
export const getDetectionResults = async (req, res) => {
    const { projectId, videoId } = req.query;

    if (!projectId || !videoId) {
        return res.status(400).json({ error: "Missing projectId or videoId" });
    }

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found." });

        const video = project.videos.find(v => v._id.toString() === videoId);
        if (!video) return res.status(404).json({ error: "Video not found in project." });

        if (!video.detectionResults || video.detectionResults.length === 0) {
            return res.status(404).json({ error: "No defect detection results available." });
        }

        const formattedResults = video.detectionResults.map(defect => ({
            ...defect.toObject(),
            framePath: `/frames/${path.basename(defect.framePath)}` // ✅ Convert to frontend URL
        }));
        
        

        res.status(200).json({
            videoTitle: video.title,
            detectionResults: formattedResults
        });

    } catch (error) {
        console.error("❌ Error fetching detection results:", error);
        res.status(500).json({ error: "Failed to retrieve defect detection results" });
    }
};

export const saveDetectionResults = async (req, res) => {
    try {
        const { projectId, videoId, detectionResults } = req.body;

        if (!projectId || !videoId || !detectionResults) {
            return res.status(400).json({ error: "Missing projectId, videoId, or detection results." });
        }

        // Find the project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found." });
        }

        // Find the specific video inside the project
        const videoIndex = project.videos.findIndex(v => v._id.toString() === videoId);
        if (videoIndex === -1) {
            return res.status(404).json({ error: "Video not found in project." });
        }

        // ✅ Update the detection results and set a flag to indicate detection has been done
        if (!Array.isArray(detectionResults) || detectionResults.length > 500) return res.status(400).json({ error: "Invalid detection results" });
        const stored = project.videos[videoIndex].detectionResults;
        const safeResults = detectionResults.map(d => {
          const original = stored.find(x => String(x._id) === d._id || x.frameNumber === d.frameNumber);
          return { videoId, frameNumber: d.frameNumber, defectType: d.defectType, confidence: d.confidence,
            framePath: original?.framePath || "/frames/unavailable.jpg", from: d.from, to: d.to,
            chainage: d.chainage, inspectorComments: d.inspectorComments };
        });
        project.videos[videoIndex].detectionResults = safeResults;
        project.videos[videoIndex].defectCount = detectionResults.length; // Update defect count
        project.videos[videoIndex].detectionCompleted = true; // ✅ Mark detection as completed

        // ✅ Save the updated project
        await project.save();

        res.status(200).json({ message: "Detection results saved successfully." });
    } catch (error) {
        console.error("❌ Error saving detection results:", error);
        res.status(error.name === "ValidationError" ? 400 : 500).json({ error: "Failed to save detection results. Check required defect fields." });
    }
};

// 📌 **Export functions**
