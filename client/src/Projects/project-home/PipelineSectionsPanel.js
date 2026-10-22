import React, { useState } from "react";
import { Paper, Typography, TextField, Button } from "@mui/material";
import useAxios from "../../api/useAxiosPrivate";

export default function PipelineSectionsPanel({
  projectId, utilityType, pipelineSections, onSectionsGenerated,
}) {
  const axiosPrivate = useAxios();
  const [sectionCountDrafts, setSectionCountDrafts] = useState({ sanitary: 0, storm: 0 });
  const utilityKey = utilityType.toLowerCase();
  const utilitySections = pipelineSections[utilityKey];
  const generatePipelineSections = async () => {
    const newSections = sectionCountDrafts[utilityKey];
    if (newSections < 2) {
      alert("Pipeline should have at least 2 sections!");
      return;
    }
    if (utilitySections.length > 0) {
      if (!window.confirm(`Existing sections for ${utilityType} will be replaced. Continue?`)) {
        return;
      }
    }
    try {
      const response = await axiosPrivate.post("/api/project/generate-sections", {
        projectId,
        utilityType,
        estimatedSections: newSections,
      });
      onSectionsGenerated(utilityType, response.data.sections);
      alert(`Pipeline sections for ${utilityType} updated successfully!`);
    } catch (error) {
      console.error("Error generating pipeline sections:", error);
      alert("Failed to generate pipeline sections.");
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 3, mb: 4 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Pipeline Sections - {utilityType}
      </Typography>
      {utilitySections.length > 0 ? (
        <Typography color="success.main">
          Sections generated for {utilityType}.
        </Typography>
      ) : (
        <Typography color="error.main">
          No sections generated for {utilityType} yet.
        </Typography>
      )}
      <TextField
        type="number"
        fullWidth
        label="Enter Number of Pipeline Sections"
        value={sectionCountDrafts[utilityKey] || ""}
        onChange={(e) => {
          const newValue = Number(e.target.value);
          setSectionCountDrafts((prev) => ({
            ...prev,
            [utilityKey]: newValue,
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
        {utilitySections.length > 0
          ? "Re-generate Sections"
          : "Generate Sections"}
      </Button>
    </Paper>
  );
}
