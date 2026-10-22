import { useEffect, useState } from "react";
import useAxios from "../api/useAxiosPrivate";
import { API_BASE_URL } from "../api";
export default function usePrivateMedia(url, projectId) {
  const api = useAxios();
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    setSource("");
    if (url && projectId) api.post("/api/media/link", { projectId, url }).then(({ data }) => {
      if (active) setSource(new URL(data.url, API_BASE_URL).href);
    }).catch(() => {});
    return () => { active = false; };
  }, [url, projectId, api]);
  return source;
}
