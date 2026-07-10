// /server/controllers/project.js
import ErrorResponse from "../utils/errorResponse.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import axios from "axios";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
  path: path.join(__dirname, '..', '.env')
});

// ------------------------ GET PROJECTS ------------------------
export const getProjects = async (req, res, next) => {
  try {
    const allProjects = await Project.find();
    res.status(200).json({ allProjects });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Token expired", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Malformed JWT token", 500));
    } else {
      return next(new ErrorResponse("Not authorized to access this route", err, 401));
    }
  }
};

// ------------------------ GET PROJECT INFO BY ID ------------------------
export const getProjectInfoByID = async (req, res, next) => {
  const { id } = req.body;
  console.log("hit", id);
  try {
    const projectInfo = await Project.findById(id);
    res.status(200).json({ projectInfo });
    console.log(projectInfo);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Token expired", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Malformed JWT token", 500));
    } else {
      return next(new ErrorResponse("Not authorized to access this route", err, 401));
    }
  }
};

// ------------------------ CREATE PROJECT ------------------------
// Merged: uses main fields plus extra fields from shubh (projectOwner, contractor, location)
// Also initializes pipelineSections (from shubh)
export const createProject = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      dateOpened,
      projectOwner,
      contractor,
      location,
      videos
    } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const project = await Project.create({
      title,
      description,
      status,
      dateOpened,
      projectOwner,
      contractor,
      location,
      videos: videos || [],
      // If your unified schema uses pipelineSections, initialize as empty arrays:
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
    } else {
      return next(new ErrorResponse("Not authorized to access this route", err, 401));
    }
  }
};

// ------------------------ DELETE VIDEO ------------------------
// export const deleteVideo = async (req, res, next) => {
//   const { projectId, videoId, s3Key } = req.body;
//   console.log("Deleting video with ID:", videoId);
//   try {
//     // Delete from S3 if s3Key is provided
//     if (s3Key) {
//       console.log('Deleting from S3:', s3Key);
//       await s3.send(new DeleteObjectCommand({
//         Bucket: process.env.S3_BUCKET_NAME,
//         Key: s3Key
//       }));
//     }
//     // Remove the video from the project's videos array
//     const project = await Project.findByIdAndUpdate(
//       projectId,
//       { $pull: { videos: { _id: videoId } } },
//       { new: true }
//     );
//     console.log("After deletion, project:", project);
//     if (!project) {
//       return res.status(404).json({ message: 'Project not found' });
//     }
//     return res.status(200).json({ success: true, message: "Video deleted successfully", project });
//   } catch (err) {
//     console.error("Error deleting video:", err);
//     return next(new ErrorResponse("Error deleting video", 500));
//   }
// };

export const deleteVideo = async (req, res, next) => {
  const { projectId, videoId, s3Key } = req.body;  // s3Key now holds the local filename
  console.log("Deleting video with ID:", videoId);
  try {
    // Delete from local filesystem if s3Key exists
    if (s3Key) {
      const filePath = path.join(__dirname, '..', 'uploads', s3Key);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
        } else {
          console.log("Successfully deleted local file:", filePath);
        }
      });
    }
    // Remove the video from the project's videos array in MongoDB
    const project = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { videos: { _id: videoId } } },
      { new: true }
    );
    console.log("After deletion, project:", project);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.status(200).json({ success: true, message: "Video deleted successfully", project });
  } catch (err) {
    console.error("Error deleting video:", err);
    return next(new ErrorResponse("Error deleting video", 500));
  }
};

// ------------------------ ADD VIDEO ------------------------
// Merged: if req.body includes utilityType, assume report-generation flow (shubh),
// otherwise assume a standard S3-upload video (main).
// export const addVideo = async (req, res, next) => {
//   try {
//     // Destructure common fields. For S3-upload, s3Key will be present.
//     const { projectId, title, notes, url, s3Key, utilityType, assignedSections } = req.body;
//     // Check required fields for both flows.
//     if (!projectId || !title || !url) {
//       return res.status(400).json({ error: "Project ID, Title, and URL are required." });
//     }
//     // If utilityType is provided, validate it for report-generation
//     if (utilityType && !["Sanitary", "Storm"].includes(utilityType)) {
//       return res.status(400).json({ error: "Invalid utility type. Must be 'Sanitary' or 'Storm'." });
//     }
//     // Fetch project
//     const project = await Project.findById(projectId);
//     if (!project) {
//       return res.status(404).json({ error: "Project not found." });
//     }

//     let newVideo = {};
//     if (utilityType) {
//       // Shubh branch style: include report generation fields.
//       // Optionally, check for pipeline sections.
//       newVideo = {
//         title,
//         notes: notes || "",
//         url,
//         utilityType,
//         assignedSections: assignedSections || [],
//         detectionResults: [],
//         detectionCompleted: false,
//       };
//     } else {
//       // Main branch style: include s3Key.
//       newVideo = {
//         title,
//         notes: notes || "",
//         url,
//         s3Key,
//       };
//     }

//     // Append new video to project.videos
//     project.videos.push(newVideo);
//     await project.save();

//     // Retrieve the newly added video from the project's videos array.
//     const savedVideo = project.videos[project.videos.length - 1];
//     console.log("Video added to project:", savedVideo);
//     res.status(200).json({
//       success: true,
//       message: "Video added successfully",
//       // Optionally return the full updated project,
//       // or just the new video.
//       newVideo: savedVideo,
//       project,
//     });
//   } catch (err) {
//     console.error("Error adding video:", err);
//     return next(new ErrorResponse("Error adding video", 500));
//   }
// };

export const addVideo = async (req, res, next) => {
  try {
    const { projectId, title, notes, url, s3Key, utilityType, assignedSections } = req.body;
    if (!projectId || !title || !url) {
      return res.status(400).json({ error: "Project ID, Title, and URL are required." });
    }
    if (utilityType && !["Sanitary", "Storm"].includes(utilityType)) {
      return res.status(400).json({ error: "Invalid utility type. Must be 'Sanitary' or 'Storm'." });
    }
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }
    // Always include s3Key and utilityType (defaulting to empty string if not provided)
    const newVideo = {
      title,
      notes: notes || "",
      url,
      s3Key: s3Key || "",
      utilityType: utilityType || "",
      assignedSections: assignedSections || [],
      detectionResults: [],
      detectionCompleted: false,
    };

    project.videos.push(newVideo);
    await project.save();

    const savedVideo = project.videos[project.videos.length - 1];
    console.log("Video added to project:", savedVideo);
    res.status(200).json({
      success: true,
      message: "Video added successfully",
      newVideo: savedVideo,
      project,
    });
  } catch (err) {
    console.error("Error adding video:", err);
    return next(new ErrorResponse("Error adding video", 500));
  }
};


// ------------------------ UPDATE PROJECT STATUS ------------------------
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
      return next(new ErrorResponse("Not authorized to access this route", err, 401));
    }
  }
};

// ------------------------ ADD USER PERMISSION TO PROJECT ------------------------
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
      return next(new ErrorResponse("Not authorized to access this route", err, 401));
    }
  }
};

// ------------------------ DELETE USER PERMISSION FROM PROJECT ------------------------
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
      return next(new ErrorResponse("Not authorized to access this route", err, 401));
    }
  }
};

// ------------------------ DELETE PROJECT (INCLUDING ALL VIDEOS) ------------------------
// export const deleteProject = async (req, res, next) => {
//   const { projectId } = req.body;
//   console.log("Deleting project with ID:", projectId);
//   try {
//     const project = await Project.findById(projectId);
//     if (!project) {
//       console.log("Project not found");
//       return next(new ErrorResponse("Project not found", 404));
//     }
//     console.log("Found project:", project);

//     // Loop over all videos and delete from S3 if s3Key exists.
//     for (const vid of project.videos) {
//       if (vid.s3Key) {
//         console.log("Deleting from S3:", vid.s3Key);
//         try {
//           await s3.send(new DeleteObjectCommand({
//             Bucket: process.env.S3_BUCKET_NAME,
//             Key: vid.s3Key,
//           }));
//           console.log("Successfully deleted S3 object:", vid.s3Key);
//         } catch (deleteErr) {
//           console.error(`Error deleting S3 object ${vid.s3Key}:`, deleteErr);
//         }
//       }
//     }

//     // Finally, delete the project document from MongoDB.
//     await Project.deleteOne({ _id: projectId });
//     console.log("Project successfully deleted from MongoDB");

//     res.status(200).json({ success: true, message: "Project and all videos deleted" });
//   } catch (err) {
//     console.error("Error in deleteProject:", err);
//     return next(new ErrorResponse("Not authorized to access this route", err, 401));
//   }
// };

export const deleteProject = async (req, res, next) => {
  const { projectId } = req.body;
  console.log("Deleting project with ID:", projectId);
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      console.log("Project not found");
      return next(new ErrorResponse("Project not found", 404));
    }
    console.log("Found project:", project);

    // Loop over all videos and delete local files if s3Key exists
    for (const vid of project.videos) {
      if (vid.s3Key) {
        const filePath = path.join(__dirname, '..', 'uploads', vid.s3Key);
        try {
          fs.unlinkSync(filePath);
          console.log("Successfully deleted local file:", filePath);
        } catch (deleteErr) {
          console.error(`Error deleting local file ${vid.s3Key}:`, deleteErr);
        }
      }
    }
    // Delete the project document from MongoDB
    await Project.deleteOne({ _id: projectId });
    console.log("Project successfully deleted from MongoDB");
    res.status(200).json({ success: true, message: "Project and all videos deleted" });
  } catch (err) {
    console.error("Error in deleteProject:", err);
    return next(new ErrorResponse("Not authorized to access this route", err, 401));
  }
};


// ------------------------ GENERATE PIPELINE SECTIONS ------------------------
// (Report generation utility from shubh)
export const generatePipelineSections = async (req, res) => {
  try {
    const { projectId, utilityType, estimatedSections } = req.body;

    if (!projectId || !utilityType || !estimatedSections || estimatedSections < 2) {
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
