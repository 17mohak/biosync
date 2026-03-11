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
    story.extend(_json_section(record.get_result(), styles, "Results"))
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
