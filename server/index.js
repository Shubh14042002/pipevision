import * as dotenv from 'dotenv'
import express  from "express";
import bodyParser from "body-parser";
import mongoose  from "mongoose";
import cors from "cors";
import axios from 'axios';
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/project.js"
import errorHandler from "./middleware/error.js";
import cookieParser from "cookie-parser"
import { fileURLToPath } from 'url';

// import multer from 'multer';

// import { uploadFile, deleteFile, getObjectSignedUrl } from './s3.js'


import path from 'path'; // Import the path module

import detectionRoutes from "./routes/detection.js";
import reportRoutes from "./routes/reportRoutes.js"; // Import the report routes

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
  path: path.join(__dirname, '.', '.env') 
});



//SET UP
const app = express();
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path, stat) => {
      res.type('mp4');
    },
  })
);

// const storage = multer.memoryStorage()
// const upload = multer({ storage: storage })

// app.get("/api/posts", async (req, res) => {
//   const posts = await prisma.posts.findMany({orderBy: [{ created: 'desc'}]})
//   for (let post of posts) {
//     post.videoUrl = await getObjectSignedUrl(post.videoName)
//   }
//   res.send(posts)
// })


// app.post('/api/posts', upload.single('video'), async (req, res) => {
//   const file = req.file
//   const caption = req.body.caption
//   const videoName = generateFileName()

//   const fileBuffer = await sharp(file.buffer)
//     .resize({ height: 1920, width: 1080, fit: "contain" })
//     .toBuffer()

//   await uploadFile(fileBuffer, videoName, file.mimetype)

//   const post = await prisma.posts.create({
//     data: {
//       videoName,
//       caption,
//     }
//   })
  
//   res.status(201).send(post)
// })

// app.delete("/api/posts/:id", async (req, res) => {
//   const id = +req.params.id
//   const post = await prisma.posts.findUnique({where: {id}}) 

//   await deleteFile(post.videoName)

//   await prisma.posts.delete({where: {id: post.id}})
//   res.send(post)
// })



app.use(cookieParser())
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin, like Postman/curl/server-to-server requests
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked request from origin: ${origin}`));
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(bodyParser.json({limit: "30mb", extended: true}));
app.use(bodyParser.urlencoded({limit: "30mb", extended: true}));
//SET UP COMPLETE

app.get("/", (req, res, next) => { //BASIC TEST, NOT USED

  res.send("Api running");

});



//SETTING ROUTES (!!!)
app.use("/api/auth", authRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/detection", detectionRoutes); //dummy api
app.use("/api/report", reportRoutes); // ✅ Register the report routes

app.use(errorHandler);  //MIDDLE WARE

app.use('/frames', express.static(path.join(__dirname, 'frames')));

//CONNECTING TO DATABASE
const CONNECTION_URL = process.env.DATABASE_CONNECTION;
const PORT = process.env.PORT || 5001;
const HOST = "0.0.0.0";

if (!CONNECTION_URL) {
  console.error("DATABASE_CONNECTION environment variable is missing.");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET environment variable is missing.");
  process.exit(1);
}

if (!process.env.REFRESH_TOKEN_SECRET) {
  console.error("REFRESH_TOKEN_SECRET environment variable is missing.");
  process.exit(1);
}

mongoose.set("strictQuery", false);

let server;

mongoose
  .connect(CONNECTION_URL)
  .then(() => {
    console.log("MongoDB connected successfully.");

    server = app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });

process.on("unhandledRejection", (err) => {
  console.error(`Unhandled rejection: ${err.message}`);

  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});