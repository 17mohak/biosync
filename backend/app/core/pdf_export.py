"""
core/pdf_export.py
==================
Professional PDF report generator using reportlab.

``generate_job_pdf(record)`` accepts a ``JobRecord`` ORM instance and returns
raw PDF bytes with no temp files written to disk.

Report sections
---------------
1. Branded header (title + timestamp)
2. Job metadata table (ID, type, created_at)
3. Input parameters
4. Results
"""

from __future__ import annotations

import io
import json
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


# ---------------------------------------------------------------------------
# Style constants
# ---------------------------------------------------------------------------

_PAGE_W, _PAGE_H = A4
_MARGIN = 2 * cm

_BRAND_COLOR   = colors.HexColor("#1a6b4a")   # deep bio-green
_ACCENT_COLOR  = colors.HexColor("#2ecc71")
_SUBTLE_GRAY   = colors.HexColor("#f4f6f4")
_TEXT_DARK     = colors.HexColor("#1c2b22")


def _make_styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=base["Title"],
            textColor=colors.white,
            fontSize=18,
            leading=22,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            textColor=colors.HexColor("#ccddcc"),
            fontSize=9,
            alignment=TA_CENTER,
            fontName="Helvetica",
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            textColor=_BRAND_COLOR,
            fontSize=11,
            spaceBefore=12,
            spaceAfter=4,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            textColor=_TEXT_DARK,
            fontSize=9,
            leading=13,
            fontName="Helvetica",
        ),
        "mono": ParagraphStyle(
            "Mono",
            parent=base["Code"],
            textColor=colors.HexColor("#0a3d2e"),
            fontSize=8,
            leading=11,
            fontName="Courier",
            backColor=colors.HexColor("#eef5ee"),
            leftIndent=6,
        ),
        "subsection": ParagraphStyle(
            "Subsection",
            parent=base["Heading3"],
            textColor=_BRAND_COLOR,
            fontSize=10,
            spaceBefore=8,
            spaceAfter=2,
            fontName="Helvetica-Bold",
        ),
    }


# ---------------------------------------------------------------------------
# Build helpers
# ---------------------------------------------------------------------------

def _header_table(job_id: int, job_type: str, created_at: datetime, styles: dict):
    """Green branded header block."""
    ts = created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if created_at else "N/A"
    title_para    = Paragraph("🧬 Bioinformatics Research Platform", styles["title"])
    subtitle_para = Paragraph(
        f"Job Report  ·  ID #{job_id}  ·  {job_type.upper()}  ·  {ts}",
        styles["subtitle"],
    )
    tbl = Table([[title_para], [subtitle_para]], colWidths=[_PAGE_W - 2 * _MARGIN])
    tbl.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), _BRAND_COLOR),
            ("TOPPADDING",    (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ])
    )
    return tbl


def _meta_table(record, styles: dict):
    """Compact two-column metadata KV table."""
    created = record.created_at.strftime("%Y-%m-%d %H:%M:%S") if record.created_at else "N/A"
    rows = [
        ["Job ID",      str(record.id)],
        ["Type",        record.job_type],
        ["Created At",  created],
        ["Notes",       record.notes or "—"],
    ]
    col_w = (_PAGE_W - 2 * _MARGIN) / 2
    tbl = Table(rows, colWidths=[col_w * 0.35, col_w * 1.65])
    tbl.setStyle(
        TableStyle([
            ("FONTNAME",      (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME",      (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("TEXTCOLOR",     (0, 0), (0, -1), _BRAND_COLOR),
            ("ROWBACKGROUNDS",(0, 0), (-1, -1), [colors.white, _SUBTLE_GRAY]),
            ("GRID",          (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ])
    )
    return tbl


def _json_section(data: dict, styles: dict, label: str) -> list:
    """Pretty-print a JSON dict as a monospaced paragraph."""
    if not data:
        return [Paragraph("(empty)", styles["body"])]

    flowables = [Paragraph(label, styles["section"])]
    formatted = json.dumps(data, indent=2, ensure_ascii=False)
    # reportlab Paragraph needs HTML-escaped text
    safe = formatted.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Split long blocks into ≤ 120 char lines to avoid overflow
    lines = "\n".join(line[:120] for line in safe.split("\n"))
    flowables.append(Paragraph(lines.replace("\n", "<br/>"), styles["mono"]))
    return flowables


def _results_section(data: dict, styles: dict, label: str) -> list:
    """Format the results section cleanly, filtering large arrays and showing alignment visual."""
    if not data:
        return [Paragraph("(empty)", styles["body"])]

    flowables = [Paragraph(label, styles["section"])]
    
    # Filter out score_matrix and position_breakdown
    filtered = {k: v for k, v in data.items() if k not in ("score_matrix", "position_breakdown")}
    
    # 1. Clean Summary
    summary_lines = []
    if "optimal_score" in filtered:
        summary_lines.append(f"<b>Global Score:</b> {filtered.pop('optimal_score')}")
    if "local_score" in filtered:
        summary_lines.append(f"<b>Local Score:</b> {filtered.pop('local_score')}")
    if "confidence_score" in filtered:
        summary_lines.append(f"<b>Confidence Score:</b> {filtered.pop('confidence_score')}")
    if "gc_content_seq1" in filtered:
        summary_lines.append(f"<b>GC Content (Seq 1):</b> {filtered.pop('gc_content_seq1')}")
    if "gc_content_seq2" in filtered:
        summary_lines.append(f"<b>GC Content (Seq 2):</b> {filtered.pop('gc_content_seq2')}")
        
    if summary_lines:
        flowables.append(Paragraph("<br/>".join(summary_lines), styles["body"]))
        flowables.append(Spacer(1, 0.3 * cm))
        
    # 2. Sequence Alignment Visual
    seq1 = filtered.pop("alignment_1", filtered.pop("local_alignment_1", None))
    seq2 = filtered.pop("alignment_2", filtered.pop("local_alignment_2", None))
    
    if seq1 and seq2:
        seq1 = str(seq1)
        seq2 = str(seq2)
        flowables.append(Paragraph("Sequence Alignment", styles["subsection"]))
        chunk_size = 60
        mono_lines = []
        for i in range(0, max(len(seq1), len(seq2)), chunk_size):
            s1_chunk = seq1[i:i+chunk_size]
            s2_chunk = seq2[i:i+chunk_size]
            mono_lines.append(f"Seq 1: {s1_chunk}")
            mono_lines.append(f"Seq 2: {s2_chunk}")
            mono_lines.append("")
        
        if mono_lines and not mono_lines[-1]:
            mono_lines.pop()
            
        safe_mono = "\n".join(mono_lines).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        flowables.append(Paragraph(safe_mono.replace("\n", "<br/>"), styles["mono"]))
        flowables.append(Spacer(1, 0.3 * cm))
        
    # 3. Mutation Summary
    if "mutation_hotspots" in data:
        flowables.append(Paragraph("Mutation Summary", styles["subsection"]))
        hotspots = filtered.pop("mutation_hotspots", [])
        if not hotspots:
            flowables.append(Paragraph("Status: Highly Stable - No Hotspots Detected.", styles["body"]))
        else:
            hotspot_lines = [json.dumps(h, ensure_ascii=False) for h in hotspots]
            safe_hotspots = "<br/>".join(hotspot_lines).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            flowables.append(Paragraph(safe_hotspots, styles["mono"]))
        flowables.append(Spacer(1, 0.3 * cm))

    # 4. Any remaining output goes as JSON
    if filtered:
        flowables.append(Paragraph("Additional Details", styles["subsection"]))
        formatted = json.dumps(filtered, indent=2, ensure_ascii=False)
        safe = formatted.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        lines = "\n".join(line[:120] for line in safe.split("\n"))
        flowables.append(Paragraph(lines.replace("\n", "<br/>"), styles["mono"]))
        
    return flowables


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_job_pdf(record) -> bytes:
    """
    Build a PDF report for *record* (a ``JobRecord`` ORM instance or any object
    with ``.id``, ``.job_type``, ``.created_at``, ``.notes``,
    ``.get_input()``, ``.get_result()`` attributes).

    Returns
    -------
    bytes
        Raw PDF content ready to stream to the client.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=_MARGIN,
        rightMargin=_MARGIN,
        topMargin=_MARGIN,
        bottomMargin=_MARGIN,
        title=f"Bio Job #{record.id}",
        author="Bioinformatics Research Platform",
    )

    styles = _make_styles()
    story = []

    # 1. Branded header
    story.append(_header_table(record.id, record.job_type, record.created_at, styles))
    story.append(Spacer(1, 0.4 * cm))

    # 2. Metadata
    story.append(Paragraph("Job Metadata", styles["section"]))
    story.append(_meta_table(record, styles))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_ACCENT_COLOR))

    # 3. Input
    story.extend(_json_section(record.get_input(), styles, "Input Parameters"))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_ACCENT_COLOR))

    # 4. Results
    story.extend(_results_section(record.get_result(), styles, "Results"))
    story.append(Spacer(1, 0.5 * cm))

    # Footer note
    story.append(
        Paragraph(
            f"Generated by Bioinformatics Research Platform v3.0.0 · "
            f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            ParagraphStyle(
                "Footer",
                parent=styles["body"],
                textColor=colors.gray,
                fontSize=7,
                alignment=TA_CENTER,
            ),
        )
    )

    doc.build(story)
    return buf.getvalue()
