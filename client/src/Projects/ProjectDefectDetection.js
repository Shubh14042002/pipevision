import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  IconButton,
  MenuItem,
  Paper,
} from "@mui/material";
import { ArrowBack, ArrowForward, Add } from "@mui/icons-material";
import { useParams, useLocation, useNavigate} from "react-router-dom";
import ReactPlayer from "react-player";
import { API, API_BASE_URL, LOCAL_API_BASE_URL } from "../api";
import SaveIcon from '@mui/icons-material/Save';

const getMediaUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";

  // If the database has an old local URL, convert the host to the deployed API URL.
  if (pathOrUrl.startsWith(LOCAL_API_BASE_URL)) {
  return pathOrUrl.replace(LOCAL_API_BASE_URL, API_BASE_URL);
}

  // If it is already a full URL, use it as-is.
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  // If it is a relative backend path like /frames/frame_47.jpg
  return `${API_BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
};

const ProjectDefectDetection = () => {
  const { id } = useParams();
  const location = useLocation();
  const { videoId, videoTitle, coveredSections = []} = location.state || {}; // Covered sections from ProjectHome.js
  const navigate = useNavigate();
  const [projectDetails, setProjectDetails] = useState({});
  const [videoDetails, setVideoDetails] = useState({});
  const [detectionResults, setDetectionResults] = useState([]);
  const [confirmedDefects, setConfirmedDefects] = useState(0);
  const [currentDefectIndex, setCurrentDefectIndex] = useState(0);
  const [comments, setComments] = useState({});
  const [chainage, setChainage] = useState({});
  const [selectedSections, setSelectedSections] = useState([]);
  const [manualDefects, setManualDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
// NEW: Track current defect's chainage & section
const [currentChainage, setCurrentChainage] = useState("");
const [currentSection, setCurrentSection] = useState("");

console.log("🚀 Component Loaded - Checking useEffect Execution");
useEffect(() => {
  console.log("🚀 useEffect is running!");

  if (!videoId) {
      console.error("❌ No videoId found!");
      setError("Missing video information.");
      setLoading(false);
      return;
  }

  const fetchProjectAndVideoDetails = async () => {
      try {
          console.log(`📡 Fetching project details for ID: ${id}`);
          const projectRes = await API.post("/api/project/projectinfo", { id });
          console.log("✅ Project response:", projectRes.data);

          setProjectDetails(projectRes.data.projectInfo);

          const selectedVideo = projectRes.data.projectInfo.videos.find((v) => v._id === videoId);
          if (!selectedVideo) {
              console.error("❌ Video not found in project.");
              setError("Video not found in project.");
              return;
          }

          console.log("✅ Selected Video:", selectedVideo);
          setVideoDetails(selectedVideo);
          setSelectedSections(selectedVideo.assignedSections || []);

          console.log("📡 Fetching detection results...");
          const { data } = await API.get(`/api/detection/results?projectId=${id}&videoId=${videoId}`);

          console.log("✅ Detection API response:", data);
          if (!data.detectionResults || data.detectionResults.length === 0) {
              console.error("❌ No detection results received!");
              setError("No detection results available.");
              return;
          }

          console.log("✅ Detection results received:", data.detectionResults);
          data.detectionResults.forEach((defect, index) => {
              console.log(`🔍 Defect ${index}: FramePath -> ${defect.framePath}`);
          });

          setDetectionResults(data.detectionResults);
          setConfirmedDefects(data.detectionResults.length);
          setLoading(false);
      } catch (error) {
          console.error("❌ Error fetching data:", error);
          setError("Failed to load project and video details.");
          setLoading(false);
      }
  };

  fetchProjectAndVideoDetails();
}, [id, videoId]);


  useEffect(() => {
    if (detectionResults.length > 0 && currentDefectIndex < detectionResults.length) {
      const currentDefect = detectionResults[currentDefectIndex];

      setCurrentChainage(currentDefect.chainage || "");  // ✅ Load correct chainage
      setCurrentSection(
        currentDefect.from ? `${currentDefect.from}-${currentDefect.to}` : ""
      ); // ✅ Load correct section
    }
  }, [currentDefectIndex, detectionResults]);
  
  

  const handleDefectsConfirmation = () => {
    setDetectionResults(detectionResults.slice(0, confirmedDefects));
  };

  const handleCommentChange = (frameNumber, value) => {
    setComments((prev) => ({ ...prev, [frameNumber]: value }));
  };

  // const handleChainageChange = (frameNumber, value) => {
  //   setChainage((prev) => ({
  //     ...prev,
  //     [frameNumber]: value, // ✅ Change only for the current defect
  //   }));
  
  //   setDetectionResults((prev) =>
  //     prev.map((defect) =>
  //       defect.frameNumber === frameNumber
  //         ? { ...defect, chainage: value } // ✅ Modify only the correct defect
  //         : defect
  //     )
  //   );
  // };
  
  // const handleSectionChange = (frameNumber, value) => {
  //   const [from, to] = value.split("-");
  
  //   setSelectedSections((prev) => ({
  //     ...prev,
  //     [frameNumber]: value, // ✅ Update only the current defect
  //   }));
  
  //   setDetectionResults((prev) =>
  //     prev.map((defect) =>
  //       defect.frameNumber === frameNumber
  //         ? { ...defect, from, to } // ✅ Modify only the correct defect
  //         : defect
  //     )
  //   );
  // };
  // NEW: Update only the current defect's chainage
  const handleChainageChange = (value) => {
    setCurrentChainage(value);
    setDetectionResults((prev) =>
      prev.map((defect, index) =>
        index === currentDefectIndex ? { ...defect, chainage: value } : defect
      )
    );
  };

  // NEW: Update only the current defect's section
  const handleSectionChange = (value) => {
    const [from, to] = value.split("-");
    setCurrentSection(value);
    setDetectionResults((prev) =>
      prev.map((defect, index) =>
        index === currentDefectIndex ? { ...defect, from, to } : defect
      )
    );
  };

  
  

  const addManualDefect = () => {
    setManualDefects([
      ...manualDefects,
      {
        frameNumber: `Manual-${manualDefects.length + 1}`,
        defectType: "New Defect",
        confidence: "N/A",
        framePath: "",
        from: "",
        to: "",
        chainage: "",
        videoId: videoId,
      },
    ]);
  };

  const nextDefect = () => {
    if (currentDefectIndex < detectionResults.length - 1) {
      setCurrentDefectIndex(currentDefectIndex + 1);
    }
  };

  const prevDefect = () => {
    if (currentDefectIndex > 0) {
      setCurrentDefectIndex(currentDefectIndex - 1);
    }
  };
  const handleSaveDetectionResults = async () => {
    try {
        await API.post("/api/detection/saveResults", {
            projectId: id,
            videoId: videoId,
            detectionResults: detectionResults, // ✅ Save confirmed results
        });

        console.log("✅ Detection results saved.");
        navigate(`/project/${id}`); // ✅ Return to Project Home
    } catch (error) {
        console.error("❌ Error saving detection results:", error);
        alert("Failed to save results.");
    }
};

return (
  <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
    {loading ? (
      <Typography>Loading...</Typography>
    ) : error ? (
      <Typography color="error">{error}</Typography>
    ) : (
      <>
        {/* Project Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {projectDetails.title} - Defect Review
          </Typography>
          <Typography><strong>Project Owner:</strong> {projectDetails.projectOwner}</Typography>
          <Typography><strong>Contractor:</strong> {projectDetails.contractor}</Typography>
          <Typography><strong>Location:</strong> {projectDetails.location}</Typography>
          <Typography><strong>Status:</strong> {projectDetails.status}</Typography>
          <Typography><strong>Date Opened:</strong> {new Date(projectDetails.dateOpened).toLocaleDateString()}</Typography>
        </Paper>

        {/* Selected Video */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>Selected Video</Typography>
          <Typography><strong>Title:</strong> {videoDetails.title}</Typography>
          <Typography gutterBottom><strong>Notes:</strong> {videoDetails.notes}</Typography>
          <Box sx={{ my: 2 }}>
            <ReactPlayer url={videoDetails.url} controls width="100%" />
          </Box>
        </Paper>

        {/* Confirm Detected Defects */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ color: "green", fontWeight: 500 }}>
            "{videoTitle}" successfully detected {detectionResults.length} defects.
          </Typography>
          <TextField
            label="Confirm Detected Defects"
            type="number"
            value={confirmedDefects}
            onChange={(e) => setConfirmedDefects(Number(e.target.value))}
            fullWidth
            margin="normal"
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={handleDefectsConfirmation}
            sx={{ mt: 2 }}
          >
            Confirm Defects
          </Button>
        </Paper>

        {/* Add Defect Button */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={addManualDefect}
            startIcon={<Add />}
            sx={{ borderRadius: 999, px: 3, py: 1.5 }}
          >
            Add Defect Manually
          </Button>
        </Box>

        {/* Detected Defects Viewer */}
        {detectionResults.length > 0 && (
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, mb: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Defect {currentDefectIndex + 1} of {detectionResults.length}
            </Typography>
            <Box sx={{ my: 2 }}>
             <img
              src={getMediaUrl(detectionResults[currentDefectIndex]?.framePath)}
              alt={`Frame ${detectionResults[currentDefectIndex]?.frameNumber}`}
              width="100%"
              style={{ maxHeight: "400px", objectFit: "contain" }}
            />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <IconButton onClick={prevDefect} disabled={currentDefectIndex === 0}>
                <ArrowBack />
              </IconButton>
              <IconButton
                onClick={nextDefect}
                disabled={currentDefectIndex === detectionResults.length - 1}
              >
                <ArrowForward />
              </IconButton>
            </Box>
            <TextField
              select
              fullWidth
              label="Select From-To Section"
              value={currentSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              margin="normal"
            >
              {selectedSections.map((section, idx) => (
                <MenuItem key={idx} value={section}>
                  {section}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Chainage Length (m)"
              value={currentChainage}
              onChange={(e) => handleChainageChange(e.target.value)}
              fullWidth
              margin="normal"
            />
          </Paper>
        )}

        {/* Save Results */}
        <Button
          variant="contained"
          color="success"
          onClick={handleSaveDetectionResults}
          sx={{ width: "100%", py: 1.5, fontWeight: 600, fontSize: "16px" }}
          startIcon={<SaveIcon />}
        >
          Save Detection Results
        </Button>
      </>
    )}
  </Container>
);
};

export default ProjectDefectDetection;