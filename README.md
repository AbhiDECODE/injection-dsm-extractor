# DSM Extractor Pro

Full-stack web application for extracting SLDC Gujarat Intra Solar DSM data from week PDF files.

## Stack
- **Backend** — Node.js + Express + Python (pdfplumber for PDF parsing)
- **Frontend** — React 18 (no UI framework, pure CSS-in-JS)
- **Export** — xlsx (Excel with styled cells)

## Prerequisites
```
Node.js >= 16
Python 3.8+
pip install pdfplumber
```

## Setup & Run

### 1. Install dependencies
```bash
# Root (server deps)
npm install

# Client (React deps)
cd client && npm install && cd ..
```

### 2. Install Python dependency
```bash
pip install pdfplumber
```

### 3. Development (runs both server + client)
```bash
npm run dev
```
- React dev server → http://localhost:3000
- API server       → http://localhost:4000

### 4. Production build
```bash
npm run build   # builds React into client/build/
npm start       # serves everything from port 4000
```
Open http://localhost:4000

## Usage
1. Open the app in browser
2. Drop or select week PDF files (e.g. Week-01.pdf … Week-47.pdf)
3. Server parses each PDF using Python — extracts all Intra Solar entities
4. Filter by QCA using the sidebar checkboxes
5. Click **Export Excel** → downloads `.xlsx` with all selected plant data
   - One table per plant, separated by a blank row
   - Yellow highlighted total rows

## Project Structure
```
dsm-app/
├── server/
│   ├── index.js          ← Express API server
│   └── dsm_parser.py     ← Python PDF parser
├── client/
│   ├── public/index.html
│   └── src/
│       ├── index.js
│       └── App.js        ← Full React UI
├── package.json
└── README.md
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/upload | Upload PDF files, returns extracted JSON |
| POST | /api/export | Send grouped data, returns .xlsx file |
| GET  | /api/health | Health check |
