import { projectFilter } from "../middleware/auth.js";
import ErrorResponse from "../utils/errorResponse.js";
import Project from "../models/Project.js";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
  path: path.join(__dirname, '..', '.env')
});

export const getProjects = async (req, res, next) => {
  try {
    const allProjects = await Project.find(projectFilter(req.user));
    res.status(200).json({ allProjects });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Token expired", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Malformed JWT token", 500));
    } else {
      return next(new ErrorResponse("Not authorized to access this route", 500));
    }
  }
};

export const getProjectInfoByID = async (req, res, next) => {
  const { id } = req.body;

  try {
    const projectInfo = await Project.findById(id);
    res.status(200).json({ projectInfo });

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Token expired", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Malformed JWT token", 500));
    } else {
      return next(new ErrorResponse("Not authorized to access this route", 500));
    }
  }
};

export const createProject = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      dateOpened,
      projectOwner,
      contractor,
      location
    } = req.body;

    if (typeof title !== "string" || !title.trim()) return res.status(400).json({ error: "Title is required" });

    const project = await Project.create({
      createdBy: req.user._id,
      title,
      description,
      status,
      dateOpened,
      projectOwner,
      contractor,
      location,
      videos: [],
      pipelineSections: { sanitary: [], storm: [] },
    });

    res.status(200).json(project._id);
  } catch (err) {
    console.error("Error creating project:", err);
    if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Token expired", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Malformed JWT token", 500));
    } else if(err.code === 11000) {
      return next(new ErrorResponse("Duplicate key error", 409));
    } else if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    } else {
      return next(new ErrorResponse("Failed to create project", 500));
    }
  }
};


export const deleteVideo = async (req, res, next) => {
  const { projectId, videoId } = req.body;
  const storedVideo = req.project.videos.id(videoId);
  if (!storedVideo) return res.status(404).json({ error: "Video not found" });
  const s3Key = storedVideo.s3Key;

  try {
    const project = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { videos: { _id: videoId } } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (s3Key && path.basename(s3Key) === s3Key) {
      const filePath = path.join(__dirname, '..', 'uploads', s3Key);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
        } else {

        }
      });
    }
    return res.status(200).json({ success: true, message: "Video deleted successfully", project });
  } catch (err) {
    console.error("Error deleting video:", err);
    return next(new ErrorResponse("Error deleting video", 500));
  }
};

export const addVideo = async (req, res, next) => {
  try {
    const { projectId, title, notes, url, s3Key, utilityType, assignedSections } = req.body;

    if (!projectId || typeof title !== "string" || !title.trim() || !url) {
      return res.status(400).json({ error: "Project ID, Video Title, and URL are required." });
    }
    if (!["Sanitary", "Storm"].includes(utilityType)) {
      return res.status(400).json({ error: "Select a utility type: Sanitary or Storm." });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (typeof s3Key !== "string" || !s3Key.startsWith(`${project._id}-video-`) ||
        path.basename(s3Key) !== s3Key || !fs.existsSync(path.join(__dirname, "..", "uploads", s3Key))) {
      return res.status(400).json({ error: "Upload a video for this project before attaching it" });
    }
    const existing = project.videos.find(v => v.s3Key === s3Key);
    if (existing) return res.json({ success: true, newVideo: existing, project });
    const newVideo = {
      title: title.trim(),
      notes: notes || "",
      url: `/uploads/${s3Key}`,
      s3Key,
      utilityType, // Never default an enum to an invalid empty string.
      assignedSections: Array.isArray(assignedSections) ? assignedSections : [],
      detectionResults: [],
      detectionCompleted: false,
    };

    project.videos.push(newVideo);
    await project.save();

    const savedVideo = project.videos[project.videos.length - 1];
    res.status(200).json({
      success: true,
      message: "Video added successfully",
      newVideo: savedVideo,
      project,
    });
  } catch (err) {
    console.error("Error adding video:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    return next(new ErrorResponse("Error adding video", 500));
  }
};


export const updateProjectStatus = async (req, res, next) => {
  const { projectId, status } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    project.status = status;
    await project.save();
    res.status(200).json({ message: "Status updated successfully", project });
  } catch (err) {
    console.error("Error updating status:", err);
    if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Token expired", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Malformed JWT token", 500));
    } else {
      return next(new ErrorResponse("Not authorized to access this route", 500));
    }
  }
};

export const addUserPermissionToProject = async (req, res, next) => {
  const { projectId, email, name, hasPermission } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const existingPermission = project.permissions.find(permission => permission.email === email);
    if (existingPermission) {
      return res.status(400).json({ message: "User already has a permission in this project" });
    }
    project.permissions.push({ email, name, hasPermission });
    await project.save();
    res.status(200).json({ message: "User permission added successfully", project });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Token expired", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Malformed JWT token", 500));
    } else {
      return next(new ErrorResponse("Not authorized to access this route", 500));
    }
  }
};

export const deleteUserPermissionFromProject = async (req, res, next) => {
  const { projectId, email } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const permissionIndex = project.permissions.findIndex(permission => permission.email === email);
    if (permissionIndex === -1) {
      return res.status(404).json({ message: "Permission not found for this user" });
    }
    project.permissions.splice(permissionIndex, 1);
    await project.save();
    res.status(200).json({ message: "User permission removed successfully", project });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Token expired", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Malformed JWT token", 500));
    } else {
      return next(new ErrorResponse("Not authorized to access this route", 500));
    }
  }
};





export const deleteProject = async (req, res, next) => {
  const { projectId } = req.body;

  try {
    const project = await Project.findById(projectId);
    if (!project) {

      return next(new ErrorResponse("Project not found", 404));
    }

    await Project.deleteOne({ _id: projectId });
    for (const vid of project.videos) {
      if (vid.s3Key && path.basename(vid.s3Key) === vid.s3Key) {
        const filePath = path.join(__dirname, '..', 'uploads', vid.s3Key);
        try {
          fs.unlinkSync(filePath);

        } catch (deleteErr) {
          console.error(`Error deleting local file ${vid.s3Key}:`, deleteErr);
        }
      }
    }

    res.status(200).json({ success: true, message: "Project and all videos deleted" });
  } catch (err) {
    console.error("Error in deleteProject:", err);
    return next(new ErrorResponse("Not authorized to access this route", 500));
  }
};


export const generatePipelineSections = async (req, res) => {
  try {
    const { projectId, utilityType, estimatedSections } = req.body;

    if (!projectId || !utilityType || !["Sanitary", "Storm"].includes(utilityType) || !Number.isInteger(estimatedSections) || estimatedSections < 2 || estimatedSections > 1000) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (!project.pipelineSections) {
      project.pipelineSections = { sanitary: [], storm: [] };
    }

    const sections = [];
    for (let i = 1; i < estimatedSections; i++) {
      sections.push({
        from: utilityType === "Sanitary" ? `SMH ${String.fromCharCode(65 + i - 1)}` : `STMH ${i}`,
        to: utilityType === "Sanitary" ? `SMH ${String.fromCharCode(65 + i)}` : `STMH ${i + 1}`,
      });
    }

    if (utilityType === "Sanitary") {
      project.pipelineSections.sanitary = sections;
    } else {
      project.pipelineSections.storm = sections;
    }

    await project.save();

    res.status(200).json({ success: true, sections });
  } catch (error) {
    console.error("❌ Error generating pipeline sections:", error);
    res.status(500).json({ error: "Failed to generate pipeline sections" });
  }
};
