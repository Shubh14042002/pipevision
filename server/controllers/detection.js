// server/controllers/detection.js
import fs, { promises as fsPromises } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import Project from "../models/Project.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonFilePath = path.join(__dirname, "..", "data", "dent.json");

const downloadVideo = async (videoUrl, videoId) => {
    // Determine the path to the videos folder
    const videosFolder = path.join(__dirname, "..", "videos");
    // Check if the folder exists; if not, create it (with recursive option)
    if (!fs.existsSync(videosFolder)) {
      fs.mkdirSync(videosFolder, { recursive: true });
      console.log("Created videos folder:", videosFolder);
    }
    
    // Build the full video path
    const videoPath = path.join(videosFolder, `${videoId}.mp4`);
    console.log(`🌍 Downloading video from ${videoUrl}...`);
    const response = await axios({ method: "get", url: videoUrl, responseType: "stream" });
    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    console.log("✅ Video downloaded successfully at:", videoPath);
    return videoPath;
  };

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
    console.log(`✅ Identified ${defects.length} key defects.`);
    return defects;
};

const extractFrames = async (videoPath, keyDefects) => {
    const framesDir = path.join(__dirname, "..", "frames");
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }
  
    let extractedFrames = [];
    for (const defect of keyDefects) {
      const frameFilename = `frame_${defect.frame}.jpg`;
      const framePath = path.join(framesDir, frameFilename);
  
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
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
    console.log(`✅ Extracted ${extractedFrames.length} frames for defects.`);
    return extractedFrames;
  };
  

// const detectDefects = async (req, res) => {
//     const { projectId, videoId } = req.body;
//     if (!projectId || !videoId) return res.status(400).json({ error: "Missing projectId or videoId" });
//     try {
//         console.log("🔍 Processing defect detection for project:", projectId, "Video ID:", videoId);
//         const project = await Project.findById(projectId);
//         if (!project) return res.status(404).json({ error: "Project not found." });
//         const videoIndex = project.videos.findIndex(v => v._id.toString() === videoId);
//         if (videoIndex === -1) return res.status(404).json({ error: "Video not found in project." });
//         let video = project.videos[videoIndex];
//         let videoPath = video.url.startsWith("http") ? await downloadVideo(video.url, videoId) : video.url;
//         console.log("📥 Reading JSON detection results...");
//         const jsonContent = await fsPromises.readFile(jsonFilePath, "utf8");
//         const detections = JSON.parse(jsonContent).detections;
//         const keyDefects = findKeyDefects(detections);
//         const detectedDefectsCount = keyDefects.length;
//         video.defectCount = detectedDefectsCount;               //update video defect count
//         console.log(`🔍 Initial defects detected: ${detectedDefectsCount}`);
//         // 📌 **New Step: Extract Frames Before Sending Response**
//         const extractedFrames = await extractFrames(videoPath, keyDefects);
//         project.videos[videoIndex].detectionResults = extractedFrames;
//         await project.save(); // Save extracted frames in the database

//         console.log(`✅ Extracted ${extractedFrames.length} frames before sending response.`);

//         res.status(200).json({ message: "Review detected defects", detectedDefectsCount, keyDefects });
//     } catch (error) {
//         console.error("❌ Error in defect detection:", error);
//         res.status(500).json({ error: "Failed to process defect detection" });
//     }
// };
const detectDefects = async (req, res) => {
    const { projectId, videoId, videoUrl, pipelineSections, assignedSections } = req.body;

    if (!projectId || !videoId || !videoUrl) {
        console.error("❌ Missing required fields:", { projectId, videoId, videoUrl });
        return res.status(400).json({ error: "Missing projectId, videoId, or videoUrl" });
    }

    try {
        console.log("🔍 Processing defect detection for project:", projectId, "Video ID:", videoId);
        
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found." });

        const videoIndex = project.videos.findIndex(v => v._id.toString() === videoId);
        if (videoIndex === -1) return res.status(404).json({ error: "Video not found in project." });

        let video = project.videos[videoIndex];

        // 🔥 **Fix: Ensure assignedSections is an array of strings**
        console.log("📦 Received assignedSections:", assignedSections);

        // ✅ Store assigned sections in the video
        project.videos[videoIndex].assignedSections = Array.isArray(assignedSections) ? assignedSections.map(String) : [];

        console.log("✅ Assigned Sections after processing:", project.videos[videoIndex].assignedSections);
        
        // 📥 **Read mock detection results from `dent.json`**
        console.log("📥 Reading JSON detection results...");
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
            framePath: path.join("server", "frames", `frame_${defect.frame}.jpg`),
            from: assignedSections.length > 0 ? assignedSections[0].split("-")[0] : "Unknown",
            to: assignedSections.length > 0 ? assignedSections[0].split("-")[1] : "Unknown",
            chainage: "0m",
            videoId: videoId,
          }));

        console.log(`checking framepath for the detected defects:${detectedDefects[0].framePath} `)
        
        console.log(`✅ Processed ${detectedDefects.length} detected defects.`);
        // 📸 **Extract frames for detected defects**
        console.log("🎥 Extracting frames from video...");
        let videoPath = videoUrl.startsWith("http") ? await downloadVideo(videoUrl, videoId) : videoUrl;
        const extractedFrames = await extractFrames(videoPath, keyDefects);
        // 🛠 **Update the project with defect detection results**
        project.videos[videoIndex].defectCount = detectedDefects.length;
        project.videos[videoIndex].detectionResults = detectedDefects;
        project.videos[videoIndex].detectionCompleted = true; // ✅ Indicate detection is completed
        await project.save();

        console.log("✅ Detection results saved successfully.");
        res.status(200).json({ message: "Detection completed successfully", detectedDefects });
    } catch (error) {
        console.error("❌ Error processing defect detection:", error);
        res.status(500).json({ error: "Failed to process defect detection" });
    }
};


export const extractDefectsAfterConfirmation = async (req, res) => {
    const { projectId, videoId, confirmedDefectsCount } = req.body;
    if (!projectId || !videoId || confirmedDefectsCount == null) {
        return res.status(400).json({ error: "Missing projectId, videoId, or confirmed defect count" });
    }
    try {
        console.log("🔍 Processing confirmed defects for project:", projectId, "Video ID:", videoId);
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found." });
        const videoIndex = project.videos.findIndex(v => v._id.toString() === videoId);
        if (videoIndex === -1) return res.status(404).json({ error: "Video not found in project." });
        let video = project.videos[videoIndex];
        const selectedDefects = keyDefects.slice(0, confirmedDefectsCount);
        const extractedFrames = await extractFrames(videoPath, selectedDefects);
        project.videos[videoIndex].detectionResults = extractedFrames;
        await project.save();
        console.log(`✅ Confirmed ${confirmedDefectsCount} defects saved.`);
        res.status(200).json({ videoTitle: video.title, detectionResults: extractedFrames });
    } catch (error) {
        console.error("❌ Error in defect confirmation:", error);
        res.status(500).json({ error: "Failed to process confirmed defects" });
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
            ...defect,
            framePath: `/frames/${path.basename(defect.framePath)}` // ✅ Convert to frontend URL
        }));
        
        
        console.log(`checking framepath for the detected defects in get func :${formattedResults[0].framePath} `)
        console.log("✅ Retrieved detection results:", formattedResults);

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
        project.videos[videoIndex].detectionResults = detectionResults;
        project.videos[videoIndex].defectCount = detectionResults.length; // Update defect count
        project.videos[videoIndex].detectionCompleted = true; // ✅ Mark detection as completed

        // ✅ Save the updated project
        await project.save();

        console.log("✅ Detection results saved successfully.");
        res.status(200).json({ message: "Detection results saved successfully." });
    } catch (error) {
        console.error("❌ Error saving detection results:", error);
        res.status(500).json({ error: "Failed to save detection results." });
    }
};

// 📌 **Export functions**