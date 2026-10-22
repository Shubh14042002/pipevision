import { useEffect, useState } from "react";
import useAxios from "../../api/useAxiosPrivate";

export default function useProjectHomeData(projectId) {
  const axiosPrivate = useAxios();
  const [project, setProject] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Generated sections feed the visible section choices. Keep the persisted project
  // metadata unchanged, as the existing detection request sends that snapshot.
  const [pipelineSections, setPipelineSections] = useState({ sanitary: [], storm: [] });

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data } = await axiosPrivate.post("/api/project/projectinfo", { id: projectId });
        setProject(data.projectInfo);
        setPipelineSections(data.projectInfo.pipelineSections || { sanitary: [], storm: [] });
        console.log("projectInfo from server:", data.projectInfo);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || "Unable to load project.");
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId, axiosPrivate]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await axiosPrivate.get("/api/auth/info", {
          headers: { "Content-Type": "application/json" },
        });
        console.log("User role:", data.user.role);
        setUser(data.user);
      } catch {
        // Preserve disabled controls when identity cannot be loaded.
        setUser(null);
      }
    };
    fetchUser();
  }, [axiosPrivate]);

  const canManage = project.permissions?.some(permission =>
    permission.email === user?.email && permission.hasPermission === true
  ) || user?.role === "manager" || user?.role === "admin";
  const canUpload = user?.role === "manager" || user?.role === "admin";

  const assignVideoSections = (videoId, assignedSections) => {
    console.log(`Updating assignedSections for video ${videoId}:`, assignedSections);
    setProject(previous => ({
      ...previous,
      videos: previous.videos.map(video => video._id === videoId ? { ...video, assignedSections } : video),
    }));
  };
  const addVideo = video => setProject(previous => ({
    ...previous,
    videos: [...previous.videos, video],
  }));
  const removeVideo = videoId => setProject(previous => ({
    ...previous,
    videos: previous.videos.filter(video => video._id !== videoId),
  }));
  const removePermission = email => setProject(previous => ({
    ...previous,
    permissions: previous.permissions.filter(permission => permission.email !== email),
  }));
  const updatePipelineSections = (utilityType, sections) => setPipelineSections(previous => ({
    ...previous,
    [utilityType.toLowerCase()]: sections,
  }));

  return {
    project, loading, error, canManage, canUpload, pipelineSections,
    assignVideoSections, addVideo, removeVideo, removePermission, updatePipelineSections,
  };
}
