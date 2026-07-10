// src/Projects/ProjectCreation.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  IconButton,
  Divider,
  Paper,
  Grid
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { API } from '../api';
import { useNavigate } from 'react-router-dom';
import useAxios from '../api/useAxiosPrivate';

const ProjectCreation = () => {
  const axiosPrivate = useAxios();
  const navigate = useNavigate();

  // State for file upload logic
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Role for permission checking
  const [role, setRole] = useState("");

  // Combined project info includes extra fields from shubh
  const [projectInfo, setProjectInfo] = useState({
    title: '',
    description: '',
    status: 'Open',
    dateOpened: dayjs(),
    projectOwner: '',
    contractor: '',
    location: '',
    videos: [],
  });

  // Video state – now includes a `utilityType` field
  const [video, setVideo] = useState({ 
    title: '', 
    notes: '', 
    url: '', 
    s3Key: '', 
    utilityType: ''  // <-- ADDED UTILITY TYPE FIELD
  });

  // Fetch user role on mount
  useEffect(() => {
    const fetchPrivateData = async () => {
      try {
        const config = { headers: { "Content-Type": "application/json" } };
        const { data } = await axiosPrivate.get("/api/auth/info", config);
        setRole(data.user.role);
      } catch (error) {
        setRole('');
      }
    };
    fetchPrivateData();
  }, [axiosPrivate]);

  // Create project – posts all fields from projectInfo
  const createProject = async () => {
    try {
      const config = { headers: { "Content-Type": "application/json" } };
      const payload = {
        title: projectInfo.title,
        description: projectInfo.description,
        status: projectInfo.status,
        dateOpened: projectInfo.dateOpened.toISOString(),
        projectOwner: projectInfo.projectOwner,
        contractor: projectInfo.contractor,
        location: projectInfo.location,
        videos: projectInfo.videos, // Videos now include utilityType
      };
      const { data } = await API.post("/api/project/createproject", payload, config);
      navigate(`/project/${data}`);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project.");
    }
  };

  // Handle changes for projectInfo fields
  const handleProjectChange = (e) => {
    const { name, value } = e.target;
    setProjectInfo(prev => ({ ...prev, [name]: value }));
  };

  // Handle file selection
  const fileSelected = (e) => {
    setFile(e.target.files[0]);
  };

  // Upload file to local storage
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

  // Drag and Drop Upload handler – keep your previous drag & drop logic
  const handleUploadAndAdd = async (selectedFile) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('videoFile', selectedFile);
      const { data } = await API.post('/api/project/uploadVideo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        const uploadedVideo = {
          title: video.title,
          notes: video.notes,
          url: data.url,
          s3Key: data.s3Key,
          utilityType: video.utilityType  // <-- Ensure utility type is included
        };
        setProjectInfo(prev => ({
          ...prev,
          videos: [...prev.videos, uploadedVideo],
        }));
        setVideo({ title: '', notes: '', url: '', s3Key: '', utilityType: '' });
        setFile(null);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  // Add video to local state (non-drag and drop)
  const handleAddVideo = () => {
    if (video.title.trim() === '') return;
    const newVid = {
      title: video.title,
      notes: video.notes,
      url: video.url,
      s3Key: video.s3Key,
      utilityType: video.utilityType,  // <-- Add utilityType to the video object
    };
    setProjectInfo(prev => ({
      ...prev,
      videos: [...prev.videos, newVid],
    }));
    setVideo({ title: '', notes: '', url: '', s3Key: '', utilityType: '' });
    setFile(null);
  };

  // Remove video from local list
  const handleRemoveVideo = (index) => {
    setProjectInfo(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  };

  const isDragDropAllowed = (role === 'manager' || role === 'admin');


  return (
    <Container maxWidth="md" sx={{ mt: 5 }}>
      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{
          fontFamily: '"DIN Condensed", sans-serif',
          letterSpacing: '0.05em',
          fontWeight: 700,
          mb: 3
        }}
      >
        CREATE NEW PROJECT
      </Typography>

      <form onSubmit={(e) => { e.preventDefault(); createProject(); }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          {/* Project Fields */}
          <TextField
            fullWidth
            label="Project Title"
            name="title"
            value={projectInfo.title}
            onChange={handleProjectChange}
            margin="normal"
            required
            sx={{ fontFamily: '"Montserrat", sans-serif' }}
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={projectInfo.description}
            onChange={handleProjectChange}
            margin="normal"
            multiline
            rows={4}
            sx={{ fontFamily: '"Montserrat", sans-serif' }}
          />
          <TextField
            select
            fullWidth
            label="Status"
            name="status"
            value={projectInfo.status}
            onChange={handleProjectChange}
            margin="normal"
            sx={{ fontFamily: '"Montserrat", sans-serif' }}
          >
            {['Open', 'In Progress', 'Closed'].map((statusOption) => (
              <MenuItem key={statusOption} value={statusOption}>
                {statusOption}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Project Owner"
            name="projectOwner"
            value={projectInfo.projectOwner}
            onChange={handleProjectChange}
            margin="normal"
            required
            sx={{ fontFamily: '"Montserrat", sans-serif' }}
          />
          <TextField
            fullWidth
            label="Contractor"
            name="contractor"
            value={projectInfo.contractor}
            onChange={handleProjectChange}
            margin="normal"
            sx={{ fontFamily: '"Montserrat", sans-serif' }}
          />
          <TextField
            fullWidth
            label="Location"
            name="location"
            value={projectInfo.location}
            onChange={handleProjectChange}
            margin="normal"
            sx={{ fontFamily: '"Montserrat", sans-serif' }}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date Opened"
              value={projectInfo.dateOpened}
              onChange={(newDate) => setProjectInfo({ ...projectInfo, dateOpened: newDate })}
              renderInput={(params) => (
                <TextField fullWidth margin="normal" sx={{ fontFamily: '"Montserrat", sans-serif' }} {...params} />
              )}
              minDate={dayjs()}
            />
          </LocalizationProvider>

          <Divider sx={{ my: 4 }} />

          {/* Video Section */}
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontFamily: '"DIN Condensed", sans-serif',
              letterSpacing: '0.05em',
              mb: 2
            }}
          >
            ADD VIDEOS
          </Typography>

          <Grid container spacing={2}>
            {/* Video Title */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Video Title"
                value={video.title}
                onChange={(e) => setVideo({ ...video, title: e.target.value })}
                sx={{ fontFamily: '"Montserrat", sans-serif' }}
              />
            </Grid>

            {/* Video Notes */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Video Notes"
                value={video.notes}
                onChange={(e) => setVideo({ ...video, notes: e.target.value })}
                sx={{ fontFamily: '"Montserrat", sans-serif' }}
              />
            </Grid>

            {/* Utility Type Dropdown */}
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="Utility Type"
                value={video.utilityType}
                onChange={(e) => setVideo({ ...video, utilityType: e.target.value })}
                sx={{ fontFamily: '"Montserrat", sans-serif' }}
              >
                <MenuItem value="">Select...</MenuItem>
                <MenuItem value="Sanitary">Sanitary</MenuItem>
                <MenuItem value="Storm">Storm</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {/* Drag and Drop Upload */}
          <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) {
                setFile(droppedFile);
                await handleUploadAndAdd(droppedFile);
              }
            }}
            sx={{
              border: '2px dashed #ccc',
              borderRadius: '8px',
              p: 3,
              textAlign: 'center',
              color: '#888',
              fontFamily: '"Montserrat", sans-serif',
              mt: 3,
              opacity: isDragDropAllowed ? 1 : 0.5,
              pointerEvents: isDragDropAllowed ? 'auto' : 'none'
            }}
          >
            Drag & Drop Video Here
          </Box>

          {/* Add Video Button
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <IconButton color="primary" onClick={handleAddVideo}>
              <Add />
            </IconButton>
          </Box> */}

          {/* Display List of Videos */}
          {projectInfo.videos.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {projectInfo.videos.map((vid, index) => (
                <Box
                  key={index}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                >
                  <Typography sx={{ fontFamily: '"Montserrat", sans-serif' }}>
                    {index + 1}. {vid.title} - {vid.utilityType || 'No Type Selected'}
                  </Typography>
                  <IconButton color="error" onClick={() => handleRemoveVideo(index)}>
                    <Delete />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          {/* Submit Button */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              color={role === 'manager' || role === 'admin' ? 'primary' : 'secondary'}
              size="large"
              disabled={!(role === 'manager' || role === 'admin')}
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {role === 'manager' || role === 'admin'
                ? 'Create Project'
                : 'Only managers can create projects'}
            </Button>
          </Box>
        </Paper>
      </form>
    </Container>
  );
};

export default ProjectCreation;
