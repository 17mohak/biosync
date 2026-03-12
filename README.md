```markdown
# BioSync | Genomic Command Center

![Architecture](https://img.shields.io/badge/Architecture-Full_Stack-emerald?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-Next.js_14-black?style=for-the-badge&logo=next.js)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

BioSync is an enterprise-grade bioinformatics workspace designed to bridge the gap between heavy computational biology and modern SaaS user experiences. It enables researchers to fetch real-world DNA variants, detect microscopic mutations, and predict the impact of structural anomalies in real-time.

---

## Core Features

* **Live NCBI GenBank Integration:** Directly fetch real-world genomic data (SARS-CoV-2, BRCA1, CFTR) using official Accession IDs via Entrez E-Utilities.
* **Precision Sequence Alignment:** Calculates local and global alignments using an optimized Python implementation of the Smith-Waterman and Needleman-Wunsch algorithms.
* **Hardware-Accelerated Visualization:** Replaces DOM-based grids with the HTML5 Canvas API, rendering dynamic scoring matrices and interactive hover states at 60FPS.
* **Thermodynamic GC Analytics:** Calculates Sequence Length, overall GC Content, and estimates Melting Temperatures (Tm), visualized via a sliding-window Recharts area graph.
* **Clinical Translation Engine:** Translates mathematical stability scores and thermodynamic data into plain-English clinical context summaries.
* **Automated Reporting:** Generates clean, 1-page PDF executive summaries of alignment hotspots and stability metrics using ReportLab.

---

## Engineering Architecture

Building a bioinformatics tool for the web introduces massive computational bottlenecks. BioSync was engineered to overcome standard browser and server limitations:

* **O(N*M) CPU Mitigation:** Aligning a 30,000bp viral genome requires a 900-million cell dynamic programming matrix. BioSync utilizes algorithmic downsampling and targeted window truncation on the backend to prevent CPU lockups.
* **DOM Overload Protection:** Mapping tens of thousands of React nodes destroys browser memory. BioSync uses a custom chunked rendering engine that groups matching DNA strings and only applies CSS animations to the exact mutated anomalies.
* **Enterprise Caching:** The FastAPI backend utilizes LRU in-memory caching to serve repeated GenBank fetches and mathematical alignments in O(1) time.

---

## Tech Stack

**Frontend (Client)**
* Framework: Next.js (React)
* Styling: Tailwind CSS, Framer Motion
* Visualization: HTML5 Canvas API, Recharts

**Backend (Server)**
* Framework: FastAPI (Python)
* Algorithms: Smith-Waterman, Needleman-Wunsch
* Integration: NCBI Entrez API

---

## Local Development

### 1. Start the FastAPI Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

```

### 2. Start the Next.js Frontend

```bash
# In a new terminal window
cd frontend
npm install
npm run dev

```

Visit `http://localhost:3000` to access the Command Center.

---

## Product Roadmap

* [x] Multi-Tool Workspace Architecture (Top Navigation)
* [x] GC Content & Thermodynamics Dashboard
* [ ] Restriction Mapping Engine: Linear timeline visualization for Enzyme cut sites.
* [ ] 3D Protein Viewer: DNA-to-Amino-Acid translation with WebGL PDB structure rendering.

```

```
