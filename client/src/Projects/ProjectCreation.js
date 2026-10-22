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
import { Delete } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import useAxios from '../api/useAxiosPrivate';

const ProjectCreation = () => {
  const axiosPrivate = useAxios();
  const navigate = useNavigate();

  // Hold selected files in browser memory until a project ID exists.
  // This prevents orphaned uploads when the project form is invalid.
  const [pendingVideos, setPendingVideos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState("");

  const [projectInfo, setProjectInfo] = useState({
    title: '',
    description: '',
    status: 'Open',
    dateOpened: dayjs(),
    projectOwner: '',
    contractor: '',
    location: '',
  });

  // These fields apply to the next video placed in the queue.
  const [video, setVideo] = useState({ title: '', notes: '', utilityType: '' });

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

  // One button, three API stages: create project -> upload each file -> attach each video.
  // The project remains valid even if a later video upload fails.
  const createProject = async () => {
    if (submitting) return;
    if (!projectInfo.title.trim()) {
      alert('Please enter a project title.');
      return;
    }
    if (role !== 'manager' && role !== 'admin') {
      alert('Only managers or admins can create projects.');
      return;
    }

    let createdProjectId = null;
    let linkedCount = 0;
    setSubmitting(true);

    try {
      // 1. Create the project WITHOUT nested videos. The server returns its ID.
      const payload = {
        ...projectInfo,
        title: projectInfo.title.trim(),
        dateOpened: projectInfo.dateOpened?.toISOString() || new Date().toISOString(),
        videos: [],
      };
      const { data: projectId } = await axiosPrivate.post(
        '/api/project/createproject',
        payload
      );
      createdProjectId = projectId;

      // 2. Upload the queued video files, then attach their metadata using the project ID.
      for (const queued of pendingVideos) {
        const formData = new FormData();
        formData.append('videoFile', queued.file);

        // Axios adds the correct multipart boundary automatically.
        const { data: upload } = await axiosPrivate.post(
          `/api/project/uploadVideo?projectId=${createdProjectId}`,
          formData,
          // Override the private Axios instance's application/json default.
          // Axios/browser provides the multipart boundary for the video upload.
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        if (!upload.success || !upload.url) {
          throw new Error('The video upload did not return a usable URL.');
        }

        try {
        await axiosPrivate.post('/api/project/addVideo', {
          projectId: createdProjectId,
          title: queued.title,
          notes: queued.notes,
          utilityType: queued.utilityType,
          url: upload.url,
          s3Key: upload.s3Key,
          assignedSections: [],
        });
        } catch (error) {
          await axiosPrivate.post('/api/project/discardUpload', { projectId: createdProjectId, s3Key: upload.s3Key }).catch(() => {});
          throw error;
        }
        linkedCount += 1;
      }

      navigate(`/project/${createdProjectId}`);
    } catch (error) {
      console.error('Project creation or video upload failed:', error);
      const reason = error.response?.data?.error ||
        error.response?.data?.message || error.message;

      if (createdProjectId) {
        // Project exists already. Don't tell users that project creation failed.
        alert(`Project created, but only ${linkedCount} of ${pendingVideos.length} videos were added. ${reason} You can add the remaining videos from the project page.`);
        navigate(`/project/${createdProjectId}`);
      } else {
        alert(`Failed to create project: ${reason}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle changes for projectInfo fields
  const handleProjectChange = (e) => {
    const { name, value } = e.target;
    setProjectInfo(prev => ({ ...prev, [name]: value }));
  };

  // Queue files locally instead of uploading before the project has been created.
  const queueVideo = (selectedFile) => {
    if (!selectedFile || submitting) return;

    if (!video.title.trim()) {
      alert('Enter a Video Title before selecting a file.');
      return;
    }
    if (!['Sanitary', 'Storm'].includes(video.utilityType)) {
      alert('Select Sanitary or Storm before selecting a file.');
      return;
    }
    if (!selectedFile.type.startsWith('video/') &&
        !/\.(mp4|mov|webm)$/i.test(selectedFile.name)) {
      alert('Please select a video file (MP4, MOV, or WebM).');
      return;
    }

    setPendingVideos((previous) => [
      ...previous,
      {
        file: selectedFile,
        title: video.title.trim(),
        notes: video.notes.trim(),
        utilityType: video.utilityType,
      },
    ]);
    setVideo({ title: '', notes: '', utilityType: '' });
  };

  const handleRemoveVideo = (index) => {
    setPendingVideos((previous) => previous.filter((_, i) => i !== index));
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
            onDrop={(e) => {
              e.preventDefault();
              // Drag & drop queues a file; nothing is uploaded until Create Project.
              queueVideo(e.dataTransfer.files[0]);
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
            <Typography>Enter a video title and utility type, then drag & drop a video here.</Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Videos are uploaded after the project is created.
            </Typography>
            <Button component="label" variant="outlined" sx={{ mt: 2 }} disabled={!isDragDropAllowed || submitting}>
              Browse video
              <input
                hidden
                type="file"
                aria-label="Select video file"
                accept="video/*,.mp4,.mov,.webm"
                onChange={(e) => {
                  queueVideo(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Button>
          </Box>

          {/* Selected files are queued; they have NOT been uploaded yet. */}
          {pendingVideos.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {pendingVideos.map((queued, index) => (
                <Box
                  key={`${queued.file.name}-${index}`}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                >
                  <Typography sx={{ fontFamily: '"Montserrat", sans-serif' }}>
                    {index + 1}. {queued.title} — {queued.utilityType} ({queued.file.name})
                  </Typography>
                  <IconButton
                    color="error"
                    disabled={submitting}
                    onClick={() => handleRemoveVideo(index)}
                    aria-label={`Remove ${queued.title}`}
                  >
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
              disabled={submitting || !(role === 'manager' || role === 'admin')}
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {submitting
                ? 'Creating Project and Uploading Videos…'
                : role === 'manager' || role === 'admin'
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
