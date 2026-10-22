import React from "react";
import { Box, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import useAxios from "../../api/useAxiosPrivate";

export default function ProjectReportDownloads({ projectId }) {
  const axiosPrivate = useAxios();

  const downloadReport = async utilityType => {
    try {
      const { data } = await axiosPrivate.get(
        `/api/report/generate-pdf/${projectId}?utility=${utilityType}`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Project-Report-${projectId}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert("Unable to download report.");
    }
  };

  return (
    <Box sx={{ textAlign: "center", mt: 5 }}>
      {[
        { type: "Sanitary", label: "Sanitary Report" },
        { type: "Storm", label: "Storm Report" },
        { type: "Both", label: "Full Report (Both)" },
      ].map(report => (
        <Button
          key={report.type}
          variant="contained"
          color="success"
          sx={{ mx: 1, my: 1 }}
          startIcon={<DownloadIcon />}
          onClick={() => downloadReport(report.type)}
        >
          Download {report.label}
        </Button>
      ))}
    </Box>
  );
}
