import React, { useState } from "react";
import { Typography, Grid, Paper, Box, TextField, MenuItem, Button } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ReplayIcon from "@mui/icons-material/Replay";
import { useNavigate } from "react-router-dom";
import InspectionVideoPlayer from "../../components/InspectionVideoPlayer";
import useAxios from "../../api/useAxiosPrivate";

export default function ProjectVideos({
  projectId,
  project,
  utilityType,
  pipelineSections,
  canManage,
  onVideoRemoved,
  onSectionsAssigned,
}) {
  const axiosPrivate = useAxios();
  const navigate = useNavigate();
  const [isDetectionLoading, setIsDetectionLoading] = useState(false);
  const filteredVideos = project.videos?.filter(video =>
    video.utilityType ? video.utilityType === utilityType : utilityType === "Sanitary"
  );
  const deleteVideo = async (videoId, s3Key) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    const config = { headers: { "Content-Type": "application/json" } };
    try {
      await axiosPrivate.post("/api/project/deletevideo", { projectId, videoId, s3Key }, config);
      onVideoRemoved(videoId);
    } catch (error) {
      console.error("Error deleting video:", error);
    }
  };

  const submitForDetection = async (videoId, videoUrl, videoTitle) => {
    if (isDetectionLoading) return;
    setIsDetectionLoading(true);
    console.log(`Sending detection request for: ${videoTitle} (${videoId}) at ${videoUrl}`);
    try {
      const video = project.videos.find(v => v._id === videoId);
      const assignedSections = video ? video.assignedSections || [] : [];
      const payload = {
        projectId,
        videoId,
        videoUrl,
        pipelineSections: project.pipelineSections || {},
        assignedSections: assignedSections.map(section => String(section)),
      };
      console.log("Payload for detection:", payload);
      const response = await axiosPrivate.post('/api/detection', payload);
      console.log("Detection response:", response.data);
      navigate(`/project/${projectId}/detection-results?videoId=${videoId}`, {
        state: { videoId, videoTitle, detectionResults: response.data.detectionResults }
      });
    } catch (error) {
      console.error("Error submitting detection:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Sample detection failed.");
    } finally {
      setIsDetectionLoading(false);
    }
  };

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Videos
      </Typography>
      <Grid container spacing={3}>
        {filteredVideos.map((video) => (
          <Grid item xs={12} key={video._id}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6">{video.title}</Typography>
              <Typography variant="body2" gutterBottom>
                {video.notes}
              </Typography>
              <Box sx={{ my: 2 }}>
                <InspectionVideoPlayer
                  key={video._id}
                  url={video.url}
                  projectId={projectId}
                  poster={video.thumbnailUrl}
                />
              </Box>
              <TextField
                select
                fullWidth
                label="Select Sections Covered by Video"
                value={Array.isArray(video.assignedSections) ? video.assignedSections : []}
                onChange={(e) => onSectionsAssigned(video._id, e.target.value)}
                SelectProps={{ multiple: true }}
                margin="normal"
              >
                {(pipelineSections[utilityType.toLowerCase()] || []).map((section, idx) => (
                  <MenuItem key={idx} value={`${section.from}-${section.to}`}>
                    {section.from} → {section.to}
                  </MenuItem>
                ))}
              </TextField>
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Button
                  onClick={() => deleteVideo(video._id, video.s3Key)}
                  variant="contained"
                  color="error"
                  disabled={!canManage}
                >
                  <DeleteIcon />
                </Button>
                <Button
                  onClick={() => submitForDetection(video._id, video.url, video.title)}
                  variant="contained"
                  color="primary"
                  disabled={isDetectionLoading}
                  startIcon={
                    video.detectionCompleted ? (
                      <ReplayIcon sx={{ color: 'white' }} />
                    ) : null
                  }
                >
                  {isDetectionLoading
                    ? 'Processing...'
                    : video.detectionCompleted
                    ? 'Resubmit for Detection'
                    : 'Run Sample Detection'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
