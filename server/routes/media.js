import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { authenticate, authorizeProject } from "../middleware/auth.js";
const router = express.Router();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const localMediaName = value => {
  try {
    const pathname = new URL(value, "http://local").pathname;
    const match = /^\/(uploads|frames)\/([a-zA-Z0-9_.-]+)$/.exec(pathname);
    return match && match[2] !== "." && match[2] !== ".." ? `${match[1]}/${match[2]}` : null;
  } catch { return null; }
};
router.post("/link", authenticate, authorizeProject, (req, res) => {
  const name = localMediaName(req.body.url);
  const owned = name && req.project.videos.some(v => localMediaName(v.url) === name ||
    v.detectionResults.some(d => localMediaName(d.framePath) === name));
  if (!owned) return res.status(404).json({ error: "Media unavailable" });
  const token = jwt.sign({ media: name }, process.env.JWT_SECRET, { expiresIn: "5m" });
  res.json({ url: `/api/media/file?token=${encodeURIComponent(token)}` });
});
router.get("/file", (req, res, next) => {
  let name;
  try {
    const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    name = decoded.media;
    if (!name || localMediaName(`/${name}`) !== name) throw new Error();
  } catch { return res.status(401).json({ error: "Unauthorized" }); }
  res.set("Cache-Control", "private, no-store");
  res.sendFile(name, { root, dotfiles: "deny" }, err => {
    if (err && !res.headersSent) res.status(err.statusCode === 404 ? 404 : 500).json({ error: "Media unavailable" });
  });
});
export default router;
