const express  = require("express");
const cors     = require("cors");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const { execFile, spawn } = require("child_process");
const XLSX     = require("xlsx-js-style");

const app  = express();
const PORT = process.env.PORT || 4000;

const jobProgress = {}; // jobId -> { totalFiles, completedFiles, fileCurr, fileTotal }

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ── Upload dir ────────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename:    (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9._-]/gi, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ── Helper: run Python parser ─────────────────────────────────────────────────
function parsePdf(pdfPath, jobId) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "dsm_parser.py");
    const child = spawn("python3", [script, pdfPath]);
    
    let stdout = "";
    let stderr = "";
    
    child.stdout.on("data", data => { stdout += data.toString(); });
    
    child.stderr.on("data", data => {
      const str = data.toString();
      stderr += str;
      
      if (jobId && jobProgress[jobId]) {
        const matches = [...str.matchAll(/PROGRESS:(\d+)\/(\d+)/g)];
        if (matches.length > 0) {
          const lastMatch = matches[matches.length - 1];
          jobProgress[jobId].fileCurr = parseInt(lastMatch[1], 10);
          jobProgress[jobId].fileTotal = parseInt(lastMatch[2], 10);
        }
      }
    });
    
    child.on("close", code => {
      if (code !== 0) return reject(new Error(stderr || `Exited with code ${code}`));
      try {
        const result = JSON.parse(stdout.trim());
        if (!result.ok) return reject(new Error(result.error));
        resolve(result.data);
      } catch (e) {
        reject(new Error("Parser output error: " + stdout.slice(0, 100)));
      }
    });
  });
}

// ── Helper: build Excel workbook ─────────────────────────────────────────────
function buildExcel(groups) {
  const wb = XLSX.utils.book_new();
  
  // Group by QCA to create separate sheets
  const qcaMap = {};
  for (const g of groups) {
    if (!qcaMap[g.qca]) qcaMap[g.qca] = [];
    qcaMap[g.qca].push(g);
  }

  const usedSheetNames = new Set();

  for (const qca of Object.keys(qcaMap)) {
    const qcaGroups = qcaMap[qca];
    const wsData = [];
    
    // 1. Get global unique weeks across this QCA
    const allWeeksSet = new Set();
    qcaGroups.forEach(g => g.rows.forEach(r => allWeeksSet.add(wkNum(r.weekNo))));
    const globalWeeks = Array.from(allWeeksSet).sort((a, b) => a - b);
    const maxDataRows = globalWeeks.length;
    
    const groupsSorted = qcaGroups.map(g => {
      const sortedRows = [...g.rows].sort((a, b) => wkNum(a.weekNo) - wkNum(b.weekNo));
      return { ...g, sortedRows };
    });
    
    const totalRowsCount = 2 + maxDataRows + 1; // title + header + data + total
    for (let i = 0; i < totalRowsCount; i++) {
      wsData.push([]);
    }
    
    const cols = [];
    const merges = [];

    for (let gi = 0; gi < groupsSorted.length; gi++) {
      const { plant, qca: groupQca, sortedRows, rows } = groupsSorted[gi];
      const startCol = gi * 4;
      
      // Fill title
      wsData[0][startCol] = `${plant} (${groupQca})`;
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 2 } });
      
      // Fill headers
      wsData[1][startCol] = "Week No.";
      wsData[1][startCol + 1] = "Injection AG";
      wsData[1][startCol + 2] = "DSM (₹)";
      
      // Fill data globally aligned by week
      for (let ri = 0; ri < globalWeeks.length; ri++) {
        const targetWeek = globalWeeks[ri];
        const r = sortedRows.find(x => wkNum(x.weekNo) === targetWeek);
        const rowIdx = 2 + ri;
        
        wsData[rowIdx][startCol] = targetWeek;
        
        if (r) {
          wsData[rowIdx][startCol + 1] = r.inj;
          wsData[rowIdx][startCol + 2] = Math.round(r.dsm);
        } else {
          // If plant has no data for this week, leave empty
          wsData[rowIdx][startCol + 1] = "";
          wsData[rowIdx][startCol + 2] = "";
        }
      }
      
      // Fill Totals
      const totRowIdx = 2 + maxDataRows;
      const totInj = rows.reduce((s, r) => s + r.inj, 0);
      const totDsm = rows.reduce((s, r) => s + r.dsm, 0);
      wsData[totRowIdx][startCol] = "TOTAL";
      wsData[totRowIdx][startCol + 1] = parseFloat(totInj.toFixed(2));
      wsData[totRowIdx][startCol + 2] = Math.round(totDsm);
      
      cols[startCol] = { wch: 14 }; // Adjusted width for 'Week No.'
      cols[startCol + 1] = { wch: 16 };
      cols[startCol + 2] = { wch: 16 };
      cols[startCol + 3] = { wch: 4 }; // spacer
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = cols;
    ws["!rows"] = [{ hpt: 35 }]; // Make title row taller to support wrapped text
    if (merges.length > 0) ws["!merges"] = merges;

    // Apply cell styles
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const inTable = (C % 4) !== 3; // columns 3, 7, 11 are empty spacers
        
        if (inTable && R <= 2 + maxDataRows) {
          if (!ws[addr]) ws[addr] = { t: "z", v: "" };
          
          let fgColor = "FFFFFF";
          let fontColor = "000000";
          let isBold = false;
          let align = { horizontal: "center", vertical: "center" };
          
          if (R === 0) {
             fgColor = "92D050"; // Template Green
             isBold = true;
             align.horizontal = "center";
             align.wrapText = true; // Wrap text for long title
          } else if (R === 1) {
             fgColor = "1F497D"; // Template Dark Blue
             fontColor = "FFFFFF"; // White text
             isBold = true;
             align.horizontal = "center";
          } else if (R === 2 + maxDataRows) {
             fgColor = "FFFF00"; // Total Yellow
             isBold = true;
          } else {
             // Data row with alternating bands
             if ((R - 2) % 2 === 0) {
                fgColor = "DCE6F1"; // Template Light Blue
             } else {
                fgColor = "FFFFFF"; // White
             }
          }
          
          ws[addr].s = {
            font: { bold: isBold, sz: R === 0 ? 11 : 11, color: { rgb: fontColor } },
            fill: { fgColor: { rgb: fgColor } },
            alignment: align,
            border: {
              top:    { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left:   { style: "thin", color: { rgb: "000000" } },
              right:  { style: "thin", color: { rgb: "000000" } },
            },
          };
          // Format numbers in col 1 and 2 of each table
          if ((C % 4) >= 1 && ws[addr].v !== "" && !isNaN(ws[addr].v) && ws[addr].v !== "TOTAL") {
             ws[addr].z = (C % 4) === 1 ? "0.00" : "#,##0";
          }
        }
      }
    }

    // Sanitize sheet name for Excel (max 31 chars, no invalid chars, unique check)
    let cleanQca = qca.replace(/[:\\/?*[\]]/g, "_").trim();
    let sheetName = cleanQca.substring(0, 27) + " DSM";
    let counter = 1;
    while (usedSheetNames.has(sheetName.toLowerCase())) {
      let suffix = `_${counter} DSM`;
      let maxBaseLen = 31 - suffix.length;
      sheetName = cleanQca.substring(0, maxBaseLen) + suffix;
      counter++;
    }
    usedSheetNames.add(sheetName.toLowerCase());
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function wkNum(s) {
  const m = s && s.match(/WEEK-(\d+)/i);
  return m ? +m[1] : 0;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/progress/:jobId
app.get("/api/progress/:jobId", (req, res) => {
  const job = jobProgress[req.params.jobId];
  if (!job) return res.json({ progress: 0, done: false });
  
  let pct = 0;
  if (job.totalFiles > 0) {
    const basePct = (job.completedFiles / job.totalFiles) * 100;
    let currFilePct = 0;
    if (job.fileTotal > 0) {
      currFilePct = (job.fileCurr / job.fileTotal) * (100 / job.totalFiles);
    }
    pct = Math.min(100, basePct + currFilePct);
  }
  
  res.json({ progress: pct, done: pct >= 100 });
});

// POST /api/upload  – accept one or many PDFs, return extracted JSON
app.post("/api/upload", upload.array("pdfs", 60), async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: "No files uploaded" });

  const jobId = req.body.jobId;
  if (jobId) {
    jobProgress[jobId] = {
      totalFiles: req.files.length,
      completedFiles: 0,
      fileCurr: 0,
      fileTotal: 0
    };
  }

  const results = [];
  const errors  = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    try {
      if (jobId && jobProgress[jobId]) {
        jobProgress[jobId].fileCurr = 0;
        jobProgress[jobId].fileTotal = 0;
      }
      const rows = await parsePdf(file.path, jobId);
      results.push(...rows);
      if (jobId && jobProgress[jobId]) jobProgress[jobId].completedFiles++;
    } catch (e) {
      errors.push({ file: file.originalname, error: e.message });
      if (jobId && jobProgress[jobId]) jobProgress[jobId].completedFiles++;
    } finally {
      fs.unlink(file.path, () => {});
    }
  }

  res.json({ ok: true, data: results, errors, count: results.length });
});

// POST /api/export  – body: { groups: [...] }, returns xlsx file
app.post("/api/export", (req, res) => {
  const { groups } = req.body;
  if (!groups || !groups.length)
    return res.status(400).json({ error: "No data to export" });

  try {
    const buf = buildExcel(groups);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="DSM_Extracted.xlsx"');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get("/api/health", (_, res) => res.json({ ok: true }));

// Serve React build in production
const clientBuild = path.join(__dirname, "../client/build");
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get("*", (_, res) => res.sendFile(path.join(clientBuild, "index.html")));
}

app.listen(PORT, () => console.log(`DSM server running on http://localhost:${PORT}`));
