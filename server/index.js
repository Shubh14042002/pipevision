import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";
dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });
const app = createApp();

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
    console.error("MongoDB connection failed. Check database availability and configuration.");
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