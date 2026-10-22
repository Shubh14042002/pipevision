import React, { useState } from "react";
import { Paper, Typography, Grid, TextField, Box } from "@mui/material";
import useAxios from "../../api/useAxiosPrivate";

export default function VideoUploadPanel({
  projectId, utilityType, canManage, canUpload, onVideoAdded,
}) {
  const axiosPrivate = useAxios();
  const [videoDraft, setVideoDraft] = useState({ title: "", notes: "" });
  const [uploading, setUploading] = useState(false);
  const handleUploadAndAdd = async (selectedFile) => {
    if (uploading) return;
    if (!videoDraft.title.trim()) {
      alert("Please enter a video title before uploading.");
      return;
    }

    if (!selectedFile) {
      alert("Please select a video file.");
      return;
    }

    if (!selectedFile.type.startsWith("video/")) {
      alert("Please upload a valid video file, such as MP4, MOV, or WebM.");
      return;
    }

    let uploadedKey;
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("videoFile", selectedFile);
      formData.append("projectId", projectId);

      const { data } = await axiosPrivate.post(`/api/project/uploadVideo?projectId=${projectId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!data.success) {
        throw new Error("Video upload failed before saving metadata.");
      }

      uploadedKey = data.s3Key;
      const uploadedVideo = {
        title: videoDraft.title.trim(),
        notes: videoDraft.notes.trim(),
        url: data.url,
        s3Key: data.s3Key,
        utilityType,
        assignedSections: [],
      };

      const res = await axiosPrivate.post(
        "/api/project/addVideo",
        {
          projectId,
          ...uploadedVideo,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const newVideo = res.data.newVideo || res.data.project.videos.slice(-1)[0];

      onVideoAdded({ ...uploadedVideo, _id: newVideo._id });

      setVideoDraft({ title: "", notes: "" });

      alert("Video uploaded successfully.");
    } catch (err) {
      if (uploadedKey) await axiosPrivate.post("/api/project/discardUpload", { projectId, s3Key: uploadedKey }).catch(() => {});
      console.error("Upload/add video failed:", err.response?.data || err.message);

      const backendMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Video upload failed.";

      alert(`Video upload failed: ${backendMessage}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mt: 5, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Add New Video
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter a video title first, then drag and drop an inspection video. In this public demo,
        defect detection uses sample CV output and extracts representative frames from the uploaded video.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Video Title"
            helperText="Required before upload"
            value={videoDraft.title}
            onChange={(e) => setVideoDraft({ ...videoDraft, title: e.target.value })}
            disabled={!canManage}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Video Description / Notes"
            helperText="Optional"
            value={videoDraft.notes}
            onChange={(e) => setVideoDraft({ ...videoDraft, notes: e.target.value })}
            disabled={!canManage}
          />
        </Grid>
      </Grid>
      <Box
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) {
            await handleUploadAndAdd(droppedFile);
          }
        }}
        sx={{
          border: "2px dashed #ccc",
          borderRadius: "8px",
          p: 3,
          textAlign: "center",
          color: "#888",
          mt: 3,
          opacity: canUpload ? 1 : 0.5,
          pointerEvents: canUpload ? 'auto' : 'none'
        }}
      >
        {uploading
          ? "Uploading video..."
          : "Drag & drop an MP4, MOV, or WebM video here after entering a title"}
      </Box>

    </Paper>
  );
}
