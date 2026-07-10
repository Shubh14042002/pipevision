import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import Project from "../models/Project.js"; 
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generatePDF = async (req, res) => {
  try {
    const { projectId } = req.params;
    // Get utility type from query string: "Sanitary", "Storm", or "Both"
    const utility = req.query.utility || "Both";

    // Fetch project details with populated video data
    const project = await Project.findById(projectId).populate("videos");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Filter videos based on the utility type
    let videosForReport = [];
    if (utility === "Sanitary") {
      videosForReport = project.videos.filter(video => video.utilityType === "Sanitary");
    } else if (utility === "Storm") {
      videosForReport = project.videos.filter(video => video.utilityType === "Storm");
    } else {
      videosForReport = project.videos;
    }

    // Create a new PDF document
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const reportsDir = path.join(__dirname, "../reports");
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const filePath = path.join(reportsDir, `Project-Report-${projectId}.pdf`);
const stream = fs.createWriteStream(filePath);
doc.pipe(stream);

    // Add Report Header
doc
  .font("Helvetica-Bold")
  .fontSize(22)
  .fillColor("#000")
  .text("PipeVision Inspection Report", 50, 45, {
    align: "center",
  });

doc
  .font("Helvetica")
  .fontSize(9)
  .fillColor("#666")
  .text(
    "Demo report generated from sample computer-vision output and sanitized project data.",
    50,
    75,
    {
      align: "center",
    }
  );

doc
  .moveTo(50, 100)
  .lineTo(545, 100)
  .strokeColor("#aaa")
  .lineWidth(1)
  .stroke();

doc
  .fillColor("#000")
  .moveDown(4);

    // Add Report Header
    doc
      .fontSize(20)
      .text("Inspection Summary", { align: "center", underline: true })
      .moveDown(2);

    // Project Details
    doc.fontSize(12)
       .text(`PROJECT: ${project.title}`)
       .text(`OWNER: ${project.projectOwner || "N/A"}`)
       .text(`CONTRACTOR: ${project.contractor || "N/A"}`)
       .text(`LOCATION: ${project.location || "N/A"}`)
       .text(`STATUS: ${project.status}`)
       .text(`DATE OPENED: ${new Date(project.dateOpened).toLocaleDateString()}`)
       .moveDown(2);

    // Table settings
    const tableX = 50;
    const tableWidth = 500;
    const colWidths = [80, 80, 80, 140, 120];
    const rowHeight = 60;
    const bottomMargin = doc.page.margins.bottom;

    // Loop through the filtered videos
    videosForReport.forEach((video, vidIndex) => {
      // Print video title and add a little spacing
      doc
        .fontSize(14)
        .fillColor("#000")
        .text(`Video: ${video.title}`, tableX, doc.y, { underline: true })
        .moveDown(0.5);

      // Draw Table Header with Borders
      let startY = doc.y;
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .strokeColor("#000")
        .lineWidth(1)
        .rect(tableX, startY, tableWidth, rowHeight)
        .stroke();

      // Draw Column Headers
      const headers = ["FROM", "TO", "CHAINAGE (m)", "DEFECT TYPE", "FRAME"];
      let currentX = tableX;
      headers.forEach((header, i) => {
        doc
          .text(header, currentX + 5, startY + 20, { width: colWidths[i] - 10, align: "center" })
          .strokeColor("#000")
          .lineWidth(1)
          .moveTo(currentX, startY)
          .lineTo(currentX, startY + rowHeight)
          .stroke();
        currentX += colWidths[i];
      });
      // Draw right-most border for last column
      doc
        .moveTo(tableX + tableWidth, startY)
        .lineTo(tableX + tableWidth, startY + rowHeight)
        .stroke();

      doc.moveDown(2);

      // Process each defect in the video's detectionResults
      video.detectionResults.forEach((defect, dIndex) => {
        // Check if there's enough space; if not, add a new page and re-draw the header for the table
        if (doc.y + rowHeight > doc.page.height - bottomMargin) {
          doc.addPage();
          // (Optionally, you can re-add the table header here on the new page)
        }

        let rowY = doc.y;
        doc.rect(tableX, rowY, tableWidth, rowHeight).stroke();
        let currentX = tableX;
        const rowData = [
          defect.from,
          defect.to,
          defect.chainage.toString(),
          defect.defectType || "Unknown",
        ];
        
        rowData.forEach((data, i) => {
          doc
            .font("Helvetica")
            .fontSize(12)
            .text(data, currentX + 5, rowY + 20, { width: colWidths[i] - 10, align: "center" })
            .strokeColor("#000")
            .lineWidth(1)
            .moveTo(currentX, rowY)
            .lineTo(currentX, rowY + rowHeight)
            .stroke();
          currentX += colWidths[i];
        });
        // Draw vertical border for the last column
        doc
          .moveTo(currentX, rowY)
          .lineTo(currentX, rowY + rowHeight)
          .stroke();

        // Insert defect image
        const imagePath = path.join(__dirname, "..", defect.framePath.replace(/^server[\\/]/, ""));
        if (fs.existsSync(imagePath)) {
          doc.image(imagePath, currentX + 5, rowY + 5, { width: 80, height: 50 });
        } else {
          doc
            .font("Helvetica")
            .text("No Image", currentX + 10, rowY + 20, { width: colWidths[4] - 10, align: "center" })
            .strokeColor("#000")
            .lineWidth(1);
        }
        // Draw right border for the image column
        doc
          .moveTo(currentX + colWidths[4], rowY)
          .lineTo(currentX + colWidths[4], rowY + rowHeight)
          .stroke();

        // Draw horizontal separator
        doc
          .moveTo(tableX, rowY + rowHeight)
          .lineTo(tableX + tableWidth, rowY + rowHeight)
          .stroke();

        doc.moveDown(1.5);
      });
      
      // If not the last video, add a page break
      if (vidIndex < videosForReport.length - 1) {
        doc.addPage();
      } 
    });
    // Finalize PDF
    doc.end();

    stream.on("finish", () => {
      res.download(filePath, `Project-Report-${projectId}.pdf`, (err) => {
        if (err) console.error("Error sending PDF:", err);
      });
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Failed to generate PDF.");
  }
};
