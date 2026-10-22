import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Project from "../models/Project.js";

export const authenticate = async (req, res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
  if (!match) return res.status(401).json({ error: "Unauthorized" });
  let decoded;
  try { decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] }); }
  catch { return res.status(401).json({ error: "Unauthorized" }); }
  if (!mongoose.isValidObjectId(decoded.id)) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = await User.findById(decoded.id).select("-password +tokenVersion");
    if (!req.user || (decoded.version || 0) !== (req.user.tokenVersion || 0)) return res.status(401).json({ error: "Unauthorized" });
    next();
  } catch (err) { next(err); }
};
export const roles = (...allowed) => (req, res, next) =>
  allowed.includes(req.user.role) ? next() : res.status(403).json({ error: "Forbidden" });

// Legacy records have no trustworthy creator. Never infer ownership from display names.
export const projectFilter = user => user.role === "admin" ? {} : { $or: [
  { createdBy: user._id },
  { permissions: { $elemMatch: { email: user.email, hasPermission: true } } }
] };
export const canAccess = (user, project) => user.role === "admin" ||
  String(project.createdBy) === String(user._id) ||
  project.permissions?.some(p => p.email === user.email && p.hasPermission === true);
export const authorizeProject = async (req, res, next) => {
  const id = req.params.projectId || req.body?.projectId || req.body?.id || req.query.projectId;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid project ID" });
  try {
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!canAccess(req.user, project)) return res.status(403).json({ error: "Forbidden" });
    req.project = project;
    next();
  } catch (err) { next(err); }
};

export const managePermissions = (req, res, next) => {
  if (req.user.role === "admin" || String(req.project.createdBy) === String(req.user._id)) return next();
  return res.status(403).json({ error: "Only the project creator or an administrator can manage permissions" });
};
