// import mongoose from 'mongoose';
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";


// const ProjectSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     trim: true,
//     //required: true,
//     match: /^[a-zA-Z\s]+$/, // Only alphabets and spaces are allowed
//   },
//   dateOpened: {
//     type: Date,
//     default: Date.now, // Automatically sets to the current date if not provided
//   },
//   description: {
//     type: String,
//     trim: true,
//     maxlength: 500, // Limit the description to 500 characters
//   },
//   status: {
//     type: String,
//     //enum: ['Open', 'In Progress', 'Closed'], // Only allow these statuses
//     default: 'Open',
//   },
//   videos: [
//     {
//       title: {
//         type: String,
//         trim: true,
//         required: true,
//       },
//       notes: {
//         type: String,
//         trim: true,
//         maxlength: 1000, // Limit notes to 1000 characters
//       },
//       url: {
//         type: String,
//         //required: true,
//         //match: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/, // Regex to validate a URL
//       },
//       s3Key: {
//         type: String,
//       },
//     },
//   ],
//   permissions: [
//     {
//       email: {
//         type: String,
//         trim: true,
//         //unique:false,
//       },
//       name: {
//         type: String,
//         required: true,
//         trim: true,
//       },
//       hasPermission: {
//         type: Boolean,
//         required: true,
//       },
//     },
//   ],
// });




// const Project = mongoose.model("Project", ProjectSchema);

// export default Project;

import mongoose from "mongoose";

const PipelineSectionsSchema = new mongoose.Schema({
  sanitary: { type: [{ from: String, to: String }], default: [] },
  storm: { type: [{ from: String, to: String }], default: [] },
});

const DefectReportSchema = new mongoose.Schema({
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
  frameNumber: { type: Number, required: true },
  defectType: { type: String, required: true },
  confidence: { type: Number, required: true },
  framePath: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  chainage: { type: String, required: true },
  inspectorComments: { type: String, default: "" },
});

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  notes: { type: String, trim: true, maxlength: 1000 },
  url: { type: String, required: true },
  s3Key: { type: String }, // from main
  utilityType: { type: String, enum: ["Sanitary", "Storm"], default: "Sanitary" }, // from shubh
  assignedSections: [{ type: String }], // from shubh
  detectionResults: [DefectReportSchema], // from shubh
  detectionCompleted: { type: Boolean, default: false }, // from shubh
});

const UnifiedProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  dateOpened: { type: Date, default: Date.now },
  description: { type: String, trim: true, maxlength: 500 },
  status: { type: String, default: "Open" },
  projectOwner: { type: String },    // from shubh
  contractor: { type: String },        // from shubh
  location: { type: String },          // from shubh
  pipelineSections: PipelineSectionsSchema, // from shubh (if applicable)
  videos: [VideoSchema],               // unified video schema
  permissions: [
    {
      email: { type: String, trim: true },
      name: { type: String, required: true, trim: true },
      hasPermission: { type: Boolean, required: true },
    }
  ],
  projectDefectReports: [DefectReportSchema], // Optionally, if you need to store aggregated defect reports
});

const Project = mongoose.model("Project", UnifiedProjectSchema);
export default Project;
