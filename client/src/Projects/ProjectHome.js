import React, { useEffect, useState } from "react";
import { Container, Typography, Paper, Tabs, Tab } from "@mui/material";
import { useParams } from "react-router-dom";
import useProjectHomeData from "./project-home/useProjectHomeData";
import ProjectOverview from "./project-home/ProjectOverview";
import ProjectActions from "./project-home/ProjectActions";
import PipelineSectionsPanel from "./project-home/PipelineSectionsPanel";
import ProjectVideos from "./project-home/ProjectVideos";
import VideoUploadPanel from "./project-home/VideoUploadPanel";
import ProjectReportDownloads from "./project-home/ProjectReportDownloads";

export default function ProjectHome() {
  const { id } = useParams();
  const [activeUtility, setActiveUtility] = useState("Sanitary");
  const {
    project, loading, error, canManage, canUpload, pipelineSections,
    assignVideoSections, addVideo, removeVideo, removePermission, updatePipelineSections,
  } = useProjectHomeData(id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {loading ? (
        <Typography>Loading project details...</Typography>
      ) : error ? <Typography role="alert" color="error">{error}</Typography> : (
        <>
          <ProjectOverview projectId={id} project={project} canManage={canManage} />
          <ProjectActions
            projectId={id} permissions={project.permissions} canManage={canManage}
            onPermissionRemoved={removePermission}
          />
          <Paper elevation={2} sx={{ borderRadius: 2, mb: 4 }}>
            <Tabs value={activeUtility} onChange={(event, value) => setActiveUtility(value)} centered>
              <Tab label="Sanitary" value="Sanitary" />
              <Tab label="Storm" value="Storm" />
            </Tabs>
          </Paper>
          <PipelineSectionsPanel
            projectId={id} utilityType={activeUtility} pipelineSections={pipelineSections}
            onSectionsGenerated={updatePipelineSections}
          />
          <ProjectVideos
            projectId={id} project={project} utilityType={activeUtility}
            pipelineSections={pipelineSections} canManage={canManage}
            onVideoRemoved={removeVideo} onSectionsAssigned={assignVideoSections}
          />
          <VideoUploadPanel
            projectId={id} utilityType={activeUtility} canManage={canManage}
            canUpload={canUpload} onVideoAdded={addVideo}
          />
          <ProjectReportDownloads projectId={id} />
        </>
      )}
    </Container>
  );
}
