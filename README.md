# Cinematic Genomic Command Center

A high-fidelity, interactive bioinformatics analysis platform. Not a dashboard—an experience.

![Architecture](https://img.shields.io/badge/architecture-void%20black-%23030303)
![Physics](https://img.shields.io/badge/physics-spring%20animations-cyan)
![Matrix](https://img.shields.io/badge/matrix-living%20grid-violet)

## The Prestige

This is not your typical bioinformatics tool. The Cinematic Genomic Command Center transforms sequence alignment into an immersive spatial data experience.

### Features

- **Void Architecture**: Absolute black (#030303) with mouse-following cyan/violet spotlight
- **Kinetic DNA Stream**: Shatter-ingestion animation, mix-blend-mode glows
- **Living Matrix**: Real-time Smith-Waterman scoring matrix with neural trace pathing
- **Mutation Heatmap**: Emerald-to-crimson gradient ribbon with high-frequency hotspot vibration
- **Scroll-Driven Narrative**: Parallax history with fluid camera-slide transitions
- **Particle Field**: 50 floating dots that move away from cursor
- **Scanline Effect**: Subtle lab-monitor aesthetic

## Quick Start

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Open http://localhost:3000
```

## Usage

1. Drop a FASTA file (or paste FASTA text) into the drop zone
2. Watch the text shatter and reassemble
3. Observe the spatial data canvas:
   - **Left**: DNA sequences with color-coded bases
   - **Hotspots**: Vibrating segments indicate instability
   - **Heatmap**: Emerald (stable) → Crimson (unstable)
   - **Right**: Living matrix with hover-trace pathing
4. Save analysis to history
5. Download PDF reports

## Tech Stack

- **Backend**: FastAPI, NumPy, SQLAlchemy, ReportLab
- **Frontend**: Next.js 16, React 19, Framer Motion, Tailwind CSS
- **Algorithms**: Smith-Waterman, Needleman-Wunsch
- **ML**: Probabilistic stability engine (numpy-only)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fasta/parse` | POST | Parse FASTA format |
| `/api/align/local` | POST | Smith-Waterman alignment |
| `/api/align/global` | POST | Needleman-Wunsch alignment |
| `/api/analyze/stability` | POST | ML stability analysis |
| `/api/history/save` | POST | Save job to database |
| `/api/history` | GET | List job history |
| `/api/export/{id}` | GET | Download PDF report |


## License

MIT
