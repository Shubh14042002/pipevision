import React, { useState } from "react";
import usePrivateMedia from "../hooks/usePrivateMedia";
import ReactPlayer from "react-player";

export default function InspectionVideoPlayer({ url, poster, projectId }) {
  const source = usePrivateMedia(url, projectId);
  const [error, setError] = useState(false);
  const [loadPlayer, setLoadPlayer] = useState(false);

  if (!source) {
    return <p>Video URL is unavailable.</p>;
  }

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        backgroundColor: "#111",
        position: "relative",
      }}
    >
      {error ? (
        <p style={{ color: "white", padding: 16 }}>
          Unable to play this video.
        </p>
      ) : !loadPlayer ? (
        <button
          type="button"
          onClick={() => setLoadPlayer(true)}
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            cursor: "pointer",
            color: "#fff",
            fontSize: "18px",
            backgroundColor: "#222",
            backgroundImage: poster
              ? `url("${poster}")`
              : undefined,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          ▶ Play video
        </button>
      ) : (
        <ReactPlayer
          url={source}
          controls
          playing={false}
          playsinline
          width="100%"
          height="100%"
          config={{
            file: {
              attributes: {
                preload: "metadata",
              },
            },
          }}
          onError={(err) => {
            console.error("Video playback error:", err);
            setError(true);
          }}
        />
      )}
    </div>
  );
}