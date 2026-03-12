"""
core/pdf_export.py
==================
Executive Summary PDF Report Generator.

Generates a clean, single-page PDF report for bioinformatics analysis jobs.
NO massive arrays, NO matrix loops - just actionable insights.

Report sections
---------------
1. Branded header (title + timestamp)
2. Job metadata (ID, Type, Sequences analyzed)
3. Alignment Summary (Score, Algorithm)
4. Stability Analysis (Confidence %, GC Content)
5. Mutation Hotspots (bulleted list or stability status)
"""

from __future__ import annotations

import io
from datetime import datetime
from typing import Any

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

_BRAND_COLOR = colors.HexColor("#1a6b4a")   # deep bio-green
_ACCENT_COLOR = colors.HexColor("#2ecc71")
_SUBTLE_GRAY = colors.HexColor("#f4f6f4")
_TEXT_DARK = colors.HexColor("#1c2b22")
_WARNING_COLOR = colors.HexColor("#e74c3c")
_SUCCESS_COLOR = colors.HexColor("#27ae60")


def _make_styles() -> dict:
    """Create custom paragraph styles for the PDF."""
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
            spaceBefore=10,
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
        "metric": ParagraphStyle(
            "Metric",
            parent=base["Normal"],
            textColor=_TEXT_DARK,
            fontSize=10,
            leading=14,
            fontName="Helvetica",
            leftIndent=10,
        ),
        "hotspot": ParagraphStyle(
            "Hotspot",
            parent=base["Normal"],
            textColor=colors.HexColor("#c0392b"),
            fontSize=9,
            leading=12,
            fontName="Helvetica",
            leftIndent=20,
            bulletIndent=10,
        ),
        "success": ParagraphStyle(
            "Success",
            parent=base["Normal"],
            textColor=_SUCCESS_COLOR,
            fontSize=10,
            leading=14,
            fontName="Helvetica-Bold",
            leftIndent=10,
        ),
    }


# ---------------------------------------------------------------------------
# Build helpers
# ---------------------------------------------------------------------------

def _header_table(job_id: int, job_type: str, created_at: datetime, styles: dict):
    """Green branded header block."""
    ts = created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if created_at else "N/A"
    title_para = Paragraph("BioSync Analysis Report", styles["title"])
    subtitle_para = Paragraph(
        f"Job #{job_id} | {job_type.upper()} | {ts}",
        styles["subtitle"],
    )
    tbl = Table([[title_para], [subtitle_para]], colWidths=[_PAGE_W - 2 * _MARGIN])
    tbl.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), _BRAND_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    return tbl


def _build_metadata_section(record, styles: dict) -> list:
    """Build job metadata section."""
    flowables = []
    flowables.append(Paragraph("Job Metadata", styles["section"]))
    
    created = record.created_at.strftime("%Y-%m-%d %H:%M:%S") if record.created_at else "N/A"
    
    # Extract sequence names from input_data if available
    input_data = record.get_input() if hasattr(record, 'get_input') else {}
    seq_names = input_data.get("sequences", ["N/A", "N/A"])
    if isinstance(seq_names, list) and len(seq_names) >= 2:
        seq_info = f"{seq_names[0]} vs {seq_names[1]}"
    else:
        seq_info = "N/A"
    
    rows = [
        ["Job ID:", str(record.id)],
        ["Type:", record.job_type.upper()],
        ["Created:", created],
        ["Sequences:", seq_info],
    ]
    
    col_w = (_PAGE_W - 2 * _MARGIN) / 2
    tbl = Table(rows, colWidths=[col_w * 0.3, col_w * 1.7])
    tbl.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), _BRAND_COLOR),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, _SUBTLE_GRAY]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    flowables.append(tbl)
    return flowables


def _build_alignment_section(result_data: dict, styles: dict) -> list:
    """Build alignment summary section."""
    flowables = []
    flowables.append(Paragraph("Alignment Summary", styles["section"]))
    
    # Determine algorithm and score
    algorithm = result_data.get("algorithm", "N/A")
    if algorithm == "smith-waterman":
        score = result_data.get("local_score", "N/A")
        score_label = "Local Score"
    else:
        score = result_data.get("optimal_score", "N/A")
        score_label = "Global Score"
    
    # Get alignment lengths
    align1 = result_data.get("alignment_1") or result_data.get("local_alignment_1", "")
    align2 = result_data.get("alignment_2") or result_data.get("local_alignment_2", "")
    alignment_length = len(align1) if align1 else 0
    
    flowables.append(Paragraph(f"<b>Algorithm:</b> {algorithm.upper()}", styles["metric"]))
    flowables.append(Paragraph(f"<b>{score_label}:</b> {score}", styles["metric"]))
    flowables.append(Paragraph(f"<b>Alignment Length:</b> {alignment_length} bp", styles["metric"]))
    
    return flowables


def _build_stability_section(result_data: dict, styles: dict) -> list:
    """Build stability analysis section."""
    flowables = []
    flowables.append(Paragraph("Stability Analysis", styles["section"]))
    
    # Get stability metrics
    confidence = result_data.get("confidence_score")
    gc1 = result_data.get("gc_content_seq1")
    gc2 = result_data.get("gc_content_seq2")
    
    # Match/Mismatch/Gap counts
    matches = result_data.get("match_count", 0)
    mismatches = result_data.get("mismatch_count", 0)
    gaps = result_data.get("gap_count", 0)
    
    if confidence is not None:
        flowables.append(Paragraph(f"<b>Confidence Score:</b> {confidence:.1f}%", styles["metric"]))
    
    if gc1 is not None and gc2 is not None:
        flowables.append(Paragraph(f"<b>GC Content:</b> Seq1={gc1:.2%} | Seq2={gc2:.2%}", styles["metric"]))
    
    flowables.append(
        Paragraph(f"<b>Alignment Stats:</b> {matches} matches, {mismatches} mismatches, {gaps} gaps", styles["metric"])
    )
    
    return flowables


def _build_hotspots_section(result_data: dict, styles: dict) -> list:
    """Build mutation hotspots section - BULLETED LIST ONLY, NO ARRAYS."""
    flowables = []
    flowables.append(Paragraph("Mutation Hotspots", styles["section"]))
    
    hotspots = result_data.get("mutation_hotspots", [])
    
    if not hotspots:
        # Stable sequence - show success message
        flowables.append(
            Paragraph("Status: Highly Stable - No Structural Anomalies or Hotspots Detected.", styles["success"])
        )
    else:
        # Build bulleted list of hotspots
        flowables.append(Paragraph(f"<b>Detected {len(hotspots)} mutation hotspot(s):</b>", styles["metric"]))
        flowables.append(Spacer(1, 0.2 * cm))
        
        for i, hs in enumerate(hotspots, 1):
            start = hs.get("start", "?")
            end = hs.get("end", "?")
            hs_type = hs.get("dominant_type", "UNKNOWN")
            instability = hs.get("window_instability", 0)
            
            # Format: "Hotspot 1: MISMATCH at positions 43-45 (instability: 0.60)"
            bullet_text = f"• Hotspot {i}: {hs_type} at positions {start}-{end} (instability: {instability:.2f})"
            flowables.append(Paragraph(bullet_text, styles["hotspot"]))
    
    return flowables


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_job_pdf(record) -> bytes:
    """
    Generate a single-page executive summary PDF for a bioinformatics analysis job.
    
    Parameters
    ----------
    record : JobRecord
        ORM instance with .id, .job_type, .created_at, .notes, .get_input(), .get_result()
    
    Returns
    -------
    bytes
        Raw PDF content ready to stream to client.
    
    Notes
    -----
    This function deliberately excludes:
    - score_matrix (can be 30,000 x 30,000 elements)
    - position_breakdown (one entry per aligned base)
    
    The PDF is designed to be a concise 1-page summary, NOT a data dump.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=_MARGIN,
        rightMargin=_MARGIN,
        topMargin=_MARGIN,
        bottomMargin=_MARGIN,
        title=f"BioSync Report #{record.id}",
        author="BioSync Command Center",
    )

    styles = _make_styles()
    story = []

    # Extract result data
    result_data = record.get_result() if hasattr(record, 'get_result') else {}
    # Handle nested structure: result_data may have 'alignment' and 'stability' keys
    if "alignment" in result_data:
        alignment_data = result_data["alignment"]
    else:
        alignment_data = result_data
    
    if "stability" in result_data:
        stability_data = result_data["stability"]
    else:
        stability_data = result_data

    # 1. Branded header
    story.append(_header_table(record.id, record.job_type, record.created_at, styles))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_ACCENT_COLOR))

    # 2. Job Metadata
    story.extend(_build_metadata_section(record, styles))
    story.append(Spacer(1, 0.2 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_ACCENT_COLOR))

    # 3. Alignment Summary
    story.extend(_build_alignment_section(alignment_data, styles))
    story.append(Spacer(1, 0.2 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_ACCENT_COLOR))

    # 4. Stability Analysis
    story.extend(_build_stability_section(stability_data, styles))
    story.append(Spacer(1, 0.2 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_ACCENT_COLOR))

    # 5. Mutation Hotspots (BULLETED LIST)
    story.extend(_build_hotspots_section(stability_data, styles))
    story.append(Spacer(1, 0.3 * cm))

    # Footer
    story.append(HRFlowable(width="100%", thickness=0.5, color=_ACCENT_COLOR))
    story.append(Spacer(1, 0.2 * cm))
    story.append(
        Paragraph(
            f"Generated by BioSync Command Center v3.0.0 | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            ParagraphStyle(
                "Footer",
                textColor=colors.gray,
                fontSize=7,
                alignment=TA_CENTER,
            ),
        )
    )

    doc.build(story)
    return buf.getvalue()
