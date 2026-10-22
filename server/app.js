import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/project.js";
import detectionRoutes from "./routes/detection.js";
import reportRoutes from "./routes/reportRoutes.js";
import mediaRoutes from "./routes/media.js";
import errorHandler from "./middleware/error.js";

// No connection or listener side effects: startup and isolated tests share this app.
export function createApp() {
  const app = express();
  const allowedOrigins = ["http://localhost:3000", process.env.CLIENT_URL].filter(Boolean);
  app.use(cookieParser());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error("Origin not allowed");
      error.statusCode = 403;
      callback(error);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
    optionsSuccessStatus: 204,
  }));
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));
  app.get("/", (req, res) => res.send("Api running"));
  app.use("/api/auth", authRoutes);
  app.use("/api/project", projectRoutes);
  app.use("/api/detection", detectionRoutes);
  app.use("/api/report", reportRoutes);
  app.use("/api/media", mediaRoutes);
  app.use(errorHandler);
  return app;
}
