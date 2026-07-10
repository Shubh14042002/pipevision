// src/Projects/ProjectHome.js
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Container,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Grid,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab
} from '@mui/material';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowForward, Add, Delete as DeleteIcon, ArrowBack } from '@mui/icons-material';
import ReactPlayer from 'react-player';
import ReplayIcon from '@mui/icons-material/Replay';
import DownloadIcon from '@mui/icons-material/Download';

import { API, API_BASE_URL } from '../api';
import useAxios from '../api/useAxiosPrivate';
import { useTheme, alpha } from '@mui/material/styles';
import dayjs from 'dayjs';

// (If not defined in this file, ensure these functions are imported)
// import { generatePipelineSections } from '../api/report'; 
// import { submitForDetection } from '../api/detection';

const ProjectHome = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const axiosPrivate = useAxios();
  const theme = useTheme();

  // State from main branch:
  const [projectInfo, setProjectInfo] = useState({});
  const [video, setVideo] = useState({ title: '', notes: '', url: '', s3Key: '', utilityType: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusChanged, setStatusChanged] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showManagePermissions, setShowManagePermissions] = useState(false);
  const [role, setRole] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  // Additional state from shubh branch:
  const [activeTab, setActiveTab] = useState("Sanitary"); // Utility type tabs: "Sanitary" or "Storm"
  const [pipelineSections, setPipelineSections] = useState({ sanitary: [], storm: [] });
  const [estimatedSections, setEstimatedSections] = useState({ sanitary: 0, storm: 0 });
  const [tempSections, setTempSections] = useState({ sanitary: 0, storm: 0 });
  const [selectedSections, setSelectedSections] = useState({}); // Mapping videoId -> assignedSections
  const [isDetectionLoading, setIsDetectionLoading] = useState(false);

  // Derived permission check
  const userHasPermission =
    (projectInfo?.permissions?.some(permission => permission.email === user?.email)) ||
    user?.role === "manager" ||
    user?.role === "admin";

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch project information (main branch logic)
  useEffect(() => {
    const fetchProjectInfo = async () => {
      try {
        const { data } = await API.post("/api/project/projectinfo", { id });
        setProjectInfo(data.projectInfo);
        setStatus(data.projectInfo.status);
        // From shubh: set pipelineSections if available
        setPipelineSections(data.projectInfo.pipelineSections || { sanitary: [], storm: [] });
        setEstimatedSections({
          sanitary: (data.projectInfo.pipelineSections?.sanitary?.length || 0) + 1,
          storm: (data.projectInfo.pipelineSections?.storm?.length || 0) + 1,
        });
        // Build a mapping for assignedSections per video:
        const videoSections = {};
        data.projectInfo.videos?.forEach((v) => {
          videoSections[v._id] = v.assignedSections || [];
        });
        setSelectedSections(videoSections);
        console.log("projectInfo from server:", data.projectInfo);
        setLoading(false); 
      } catch (error) {
        console.error("Error fetching project info:", error);
      }
    };
    fetchProjectInfo();
  }, [id]);

  // Fetch users and role (permissions)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axiosPrivate.get("/api/auth/getusers", { headers: { "Content-Type": "application/json" } });
        setUsers(data.users);
      } catch (error) {
        setError("Error fetching users");
      }
    };
    fetchUsers();

    const fetchRole = async () => {
      try {
        const { data } = await axiosPrivate.get("/api/auth/info", { headers: { "Content-Type": "application/json" } });
        console.log("User role:", data.user.role);
        setRole(data.user.role);
        setUser(data.user);
      } catch (error) {
        setRole('');
      }
    };
    fetchRole();
  }, []);

  // Update status when projectInfo changes
  useEffect(() => {
    if (projectInfo.status) {
      setStatus(projectInfo.status);
      setStatusChanged(false);
    }
  }, [projectInfo]);

  // ------------------- Permissions Handlers -------------------
  const handleManagePermissionsClick = () => {
    setShowManagePermissions(prev => !prev);
  };

  const handleAddPermissionsClick = () => {
    setShowPermissions(prev => !prev);
  };

  const handleCheckboxChange = (email) => {
    setSelectedUsers(prev =>
      prev.includes(email)
        ? prev.filter(u => u !== email)
        : [...prev, email]
    );
  };

  const addPermissionToProject = async (email, name, hasPermission) => {
    const config = { headers: { "Content-Type": "application/json" } };
    try {
      const response = await API.post("/api/project/addPerm", { projectId: id, email, name, hasPermission }, config);
      console.log("User permission added:", response.data);
      setProjectInfo(prev => ({
        ...prev,
        permissions: [...(prev.permissions || []), { email, name, hasPermission }]
      }));
    } catch (error) {
      console.error("Error adding permission:", error);
    }
  };

  const handleAssignPermissions = () => {
    if (selectedUsers.length > 0) {
      selectedUsers.forEach(email => {
        const usr = users.find(u => u.email === email);
        if (usr) {
          addPermissionToProject(usr.email, usr.name, true);
        }
      });
    } else {
      setError("No users selected.");
    }
  };

  const handleRemovePermission = async (email) => {
    const config = { headers: { "Content-Type": "application/json" } };
    try {
      const response = await API.post("/api/project/deletePerm", { projectId: id, email }, config);
      console.log("User permission removed:", response.data);
      setProjectInfo(prev => ({
        ...prev,
        permissions: prev.permissions.filter(perm => perm.email !== email)
      }));
    } catch (error) {
      console.error("Error removing permission:", error);
    }
  };

  // ------------------- Project & Video Actions -------------------
  const deleteProject = async () => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      await API.post("/api/project/deleteproject", { projectId: id });
      navigate("/");
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const addVideo = async () => {
    // Enforce that the user has uploaded a file so that s3Key is present
    if (!video.s3Key) {
      alert("Please upload the video file first before adding the video.");
      return;
    }
    const config = { headers: { "Content-Type": "application/json" } };
    try {
      const payload = {
        projectId: id,
        title: video.title,
        notes: video.notes,
        url: video.url,
        s3Key: video.s3Key, // This now holds the local filename
        // For videos with detection/report features:
        utilityType: video.utilityType || activeTab,
        // Here, since video._id doesn't exist (as it's not saved yet),
        // we pass an empty array for assignedSections
        assignedSections: [],
      };
      const { data } = await API.post("/api/project/addVideo", payload, config);
      // Manually push new video into state including s3Key and utilityType
      setProjectInfo(prev => ({
        ...prev,
        videos: [
          ...prev.videos,
          {
            title: video.title,
            notes: video.notes,
            url: video.url,
            _id: data.newVideo
              ? data.newVideo._id
              : data.project.videos[data.project.videos.length - 1]._id,
            s3Key: data.newVideo
              ? data.newVideo.s3Key
              : data.project.videos[data.project.videos.length - 1].s3Key,
            utilityType: data.newVideo
              ? data.newVideo.utilityType
              : activeTab,
            assignedSections: data.newVideo
              ? data.newVideo.assignedSections
              : []
          }
        ]
      }));
      // Clear the video state after adding
      setVideo({ title: '', notes: '', url: '', s3Key: '', utilityType: '' });
    } catch (error) {
      console.error("Error adding video:", error);
    }
  };
  

  const deleteVideo = async (videoId, s3Key) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    const config = { headers: { "Content-Type": "application/json" } };
    try {
      await API.post("/api/project/deletevideo", { projectId: id, videoId, s3Key }, config);
      setProjectInfo(prev => ({
        ...prev,
        videos: prev.videos.filter(v => v._id !== videoId)
      }));
    } catch (error) {
      console.error("Error deleting video:", error);
    }
  };

  const fileSelected = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadFile = async () => {
      if (!file) return;
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('videoFile', file);
        const { data } = await API.post('/api/project/uploadVideo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (data.success) {
          // Build the full URL if needed (e.g., prepend the hostname)
          setVideo(prev => ({ ...prev, url: data.url, s3Key: data.s3Key }));
          alert('Upload successful');
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        alert('Error uploading file');
      } finally {
        setUploading(false);
      }
    };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setStatusChanged(true);
  };

  const handleUpdateStatus = async () => {
    try {
      const config = { headers: { "Content-Type": "application/json" } };
      await axiosPrivate.post("/api/project/updateStatus", { projectId: id, status }, config);
      setStatusChanged(false);
      alert("Status updated successfully");
    } catch (err) {
      console.error("Error updating project status:", err);
    }
  };

  // ------------------- Utility Tabs & Pipeline -------------------
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Filter videos by activeTab. If a video doesn't have utilityType, assume it belongs to "Sanitary" (main branch).
  const filteredVideos = projectInfo?.videos?.filter(v => v.utilityType ? v.utilityType === activeTab : activeTab === "Sanitary");

  // Update video details (e.g., assignedSections) for a video
  const updateVideoDetails = (videoId, field, value) => {
    console.log(`Updating ${field} for video ${videoId}:`, value);
    setProjectInfo(prev => ({
      ...prev,
      videos: prev.videos.map(v => v._id === videoId ? { ...v, [field]: value } : v)
    }));
    setSelectedSections(prev => ({
      ...prev,
      [videoId]: value,
    }));
  };

  // Submit for detection (defect detection) for a video
  const submitForDetection = async (videoId, videoUrl, videoTitle) => {
    setIsDetectionLoading(true);
    console.log(`Sending detection request for: ${videoTitle} (${videoId}) at ${videoUrl}`);
    try {
      const vid = projectInfo.videos.find(v => v._id === videoId);
      const assignedSecs = vid ? vid.assignedSections || [] : [];
      const payload = {
        projectId: id,
        videoId,
        videoUrl,
        pipelineSections: projectInfo.pipelineSections || {},
        assignedSections: assignedSecs.map(section => String(section)),
      };
      console.log("Payload for detection:", payload);
      const response = await API.post('/api/detection', payload);
      console.log("Detection response:", response.data);
      navigate(`/project/${id}/detection-results`, {
        state: { videoId, videoTitle, detectionResults: response.data.detectionResults }
      });
    } catch (error) {
      console.error("Error submitting detection:", error.response?.data || error.message);
      alert("Failed to detect defects.");
    } finally {
      setIsDetectionLoading(false);
    }
  };

  // ------------------- Pipeline Sections Generation -------------------
  const generatePipelineSections = async () => {
    const newSections = tempSections[activeTab.toLowerCase()];
    if (newSections < 2) {
      alert("Pipeline should have at least 2 sections!");
      return;
    }
    if (pipelineSections[activeTab.toLowerCase()].length > 0) {
      if (!window.confirm(`Existing sections for ${activeTab} will be replaced. Continue?`)) {
        return;
      }
    }
    try {
      const response = await API.post("/api/project/generate-sections", {
        projectId: id,
        utilityType: activeTab,
        estimatedSections: newSections,
      });
      setPipelineSections(prev => ({
        ...prev,
        [activeTab.toLowerCase()]: response.data.sections,
      }));
      setEstimatedSections(prev => ({
        ...prev,
        [activeTab.toLowerCase()]: newSections,
      }));
      alert(`Pipeline sections for ${activeTab} updated successfully!`);
    } catch (error) {
      console.error("Error generating pipeline sections:", error);
      alert("Failed to generate pipeline sections.");
    }
  };

  const handleUploadAndAdd = async (selectedFile) => {
  if (!video.title.trim()) {
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

  try {
    setUploading(true);

    const formData = new FormData();
    formData.append("videoFile", selectedFile);

    const { data } = await API.post("/api/project/uploadVideo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (!data.success) {
      throw new Error("Video upload failed before saving metadata.");
    }

    const uploadedVideo = {
      title: video.title.trim(),
      notes: video.notes.trim(),
      url: data.url,
      s3Key: data.s3Key,
      utilityType: activeTab,
      assignedSections: [],
    };

    const res = await API.post(
      "/api/project/addVideo",
      {
        projectId: id,
        ...uploadedVideo,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const newVideo = res.data.newVideo || res.data.project.videos.slice(-1)[0];

    setProjectInfo((prev) => ({
      ...prev,
      videos: [...prev.videos, { ...uploadedVideo, _id: newVideo._id }],
    }));

    setVideo({ title: "", notes: "", url: "", s3Key: "", utilityType: "" });
    setFile(null);

    alert("Video uploaded successfully.");
  } catch (err) {
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
  
  
  const isDragDropAllowed = (role === 'manager' || role === 'admin');
  

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {loading ? (
        <Typography>Loading project details...</Typography>
      ) : (
        <>
          {/* Project Info Card */}
          <Paper elevation={4} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {projectInfo.title}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Description:</strong> {projectInfo.description}
                </Typography>
                <Typography variant="subtitle1">
                  <strong>Date Opened:</strong> {new Date(projectInfo.dateOpened).toLocaleDateString()}
                </Typography>
                <Typography variant="subtitle1">
                  <strong>Status:</strong> {projectInfo.status}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Owner:</strong> {projectInfo.projectOwner || "N/A"}
                </Typography>
                <Typography variant="subtitle1">
                  <strong>Contractor:</strong> {projectInfo.contractor || "N/A"}
                </Typography>
                <Typography variant="subtitle1">
                  <strong>Location:</strong> {projectInfo.location || "N/A"}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Status Control */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              mb: 4,
            }}
          >
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
                value={status}
                label="Status"
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={!userHasPermission}
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </Select>
            </FormControl>
            <Button
              onClick={handleUpdateStatus}
              variant="contained"
              color="primary"
              disabled={!userHasPermission || status === projectInfo.status}
            >
              Update
            </Button>
          </Box>

          {/* Delete Project Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
            <Button
              onClick={deleteProject}
              variant="contained"
              color="error"
              size="large"
              disabled={!userHasPermission}
            >
              Delete Project
            </Button>
          

            {/* Permissions */}
            
              <Button
                variant="contained"
                onClick={handleManagePermissionsClick}
                disabled={!userHasPermission}
              >
                {showManagePermissions ? "Hide Permissions" : "Manage Permissions"}
              </Button>
              {showManagePermissions && (
                <List sx={{ mt: 2, mx: "auto", maxWidth: 500 }}>
                  {projectInfo?.permissions?.map((permission) => (
                    <ListItem key={permission._id}>
                      <ListItemText
                        primary={permission.name}
                        secondary={
                          permission.hasPermission ? "Has Permission" : "No Permission"
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="remove"
                          onClick={() => handleRemovePermission(permission.email)}
                          disabled={!userHasPermission}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
          </Box>

          {/* Tabs */}
          <Paper elevation={2} sx={{ borderRadius: 2, mb: 4 }}>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
              <Tab label="Sanitary" value="Sanitary" />
              <Tab label="Storm" value="Storm" />
            </Tabs>
          </Paper>

          {/* Pipeline Setup */}
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, mb: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Pipeline Sections - {activeTab}
            </Typography>
            {pipelineSections[activeTab.toLowerCase()].length > 0 ? (
              <Typography color="success.main">
                Sections generated for {activeTab}.
              </Typography>
            ) : (
              <Typography color="error.main">
                No sections generated for {activeTab} yet.
              </Typography>
            )}
            <TextField
              type="number"
              fullWidth
              label="Enter Number of Pipeline Sections"
              value={tempSections[activeTab.toLowerCase()] || ""}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setTempSections((prev) => ({
                  ...prev,
                  [activeTab.toLowerCase()]: newValue,
                }));
              }}
              sx={{ mt: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={generatePipelineSections}
              sx={{ mt: 2 }}
            >
              {pipelineSections[activeTab.toLowerCase()].length > 0
                ? "Re-generate Sections"
                : "Generate Sections"}
            </Button>
          </Paper>

          {/* Videos */}
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Videos
          </Typography>
          <Grid container spacing={3}>
            {filteredVideos.map((vid) => (
              <Grid item xs={12} key={vid._id}>
                <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="h6">{vid.title}</Typography>
                  <Typography variant="body2" gutterBottom>
                    {vid.notes}
                  </Typography>
                  <Box sx={{ my: 2 }}>
                    <ReactPlayer url={vid.url} controls width="100%" />
                  </Box>
                  <TextField
                    select
                    fullWidth
                    label="Select Sections Covered by Video"
                    value={Array.isArray(selectedSections[String(vid._id)]) ? selectedSections[String(vid._id)] : []}
                    onChange={(e) => updateVideoDetails(vid._id, "assignedSections", e.target.value)}
                    SelectProps={{ multiple: true }}
                    margin="normal"
                  >
                    {(pipelineSections[activeTab.toLowerCase()] || []).map((section, idx) => (
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
                      onClick={() => deleteVideo(vid._id, vid.s3Key)}
                      variant="contained"
                      color="error"
                      disabled={!userHasPermission}
                    >
                      <DeleteIcon />
                    </Button>
                    <Button
                      onClick={() => submitForDetection(vid._id, vid.url, vid.title)}
                      variant="contained"
                      color="primary"
                      disabled={isDetectionLoading}
                      startIcon={
                        vid.detectionCompleted ? (
                          <ReplayIcon sx={{ color: 'white' }} />
                        ) : null
                      }
                    >
                      {isDetectionLoading
                        ? 'Processing...'
                        : vid.detectionCompleted
                        ? 'Resubmit for Detection'
                        : 'Submit for Detection'}
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Add Video */}
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
                  value={video.title}
                  onChange={(e) => setVideo({ ...video, title: e.target.value })}
                  disabled={!userHasPermission}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                fullWidth
                label="Video Description / Notes"
                helperText="Optional"
                value={video.notes}
                onChange={(e) => setVideo({ ...video, notes: e.target.value })}
                disabled={!userHasPermission}
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
                opacity: isDragDropAllowed ? 1 : 0.5,
                pointerEvents: isDragDropAllowed ? 'auto' : 'none'
              }}
            >
              {uploading
                ? "Uploading video..."
                : "Drag & drop an MP4, MOV, or WebM video here after entering a title"}
            </Box>
            {/* <Box sx={{ textAlign: "center", mt: 2 }}>
              <IconButton
                color="primary"
                onClick={addVideo}
                disabled={!userHasPermission || !video.s3Key}
              >
                <Add />
              </IconButton>
            </Box> */}
          </Paper>

          {/* Download Reports */}
          <Box sx={{ textAlign: "center", mt: 5 }}>
            {[
              { type: "Sanitary", label: "Sanitary Report" },
              { type: "Storm", label: "Storm Report" },
              { type: "Both", label: "Full Report (Both)" },
            ].map((report) => (
              <Button
                key={report.type}
                variant="contained"
                color="success"
                sx={{ mx: 1, my: 1 }}
                startIcon={<DownloadIcon />}
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/report/generate-pdf/${id}?utility=${report.type}`,
                    "_blank"
                  )
                }
              >
                Download {report.label}
              </Button>
            ))}
          </Box>
        </>
      )}
    </Container>
  );
};

export default ProjectHome;
