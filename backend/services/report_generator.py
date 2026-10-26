import io
import datetime
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_report(data: Dict[str, Any]) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E1916'),
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#545454')
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#EAA636'),
        fontName='Helvetica-Bold'
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#222222')
    )
    badge_style = ParagraphStyle(
        'DocBadge',
        parent=styles['Normal'],
        fontSize=14,
        leading=18,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        alignment=1
    )

    story = []

    # Header
    story.append(Paragraph("TruthLens AI – Misinformation Detection Report", title_style))
    story.append(Paragraph(f"Analysis ID: {data.get('analysis_id', 'ANL-001')} | Generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#EAA636'), spaceAfter=15))

    # Executive Result Card
    classification = data.get("result", {}).get("classification", "UNVERIFIED")
    conf = data.get("result", {}).get("confidence_score", 0)
    strength = data.get("result", {}).get("evidence_strength", "MEDIUM")

    badge_bg = colors.HexColor('#28a745') if classification == "REAL" else (
        colors.HexColor('#dc3545') if classification == "FAKE" else (
            colors.HexColor('#ffc107') if classification == "MISLEADING" else colors.HexColor('#6c757d')
        )
    )

    result_table = Table([
        [Paragraph(f"FINAL ASSESSMENT: {classification}", badge_style)],
        [Paragraph(f"<b>Confidence:</b> {conf}% &nbsp;|&nbsp; <b>Evidence Strength:</b> {strength} &nbsp;|&nbsp; <b>Model:</b> {data.get('model', {}).get('name', 'BERT Hybrid')}", subtitle_style)]
    ], colWidths=[530])
    result_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), badge_bg),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#FDF5EB')),
        ('TOPPADDING', (0, 1), (-1, 1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#EAA636')),
    ]))
    story.append(result_table)
    story.append(Spacer(1, 15))

    # Source Analysis
    story.append(Paragraph("1. SOURCE ANALYSIS", h2_style))
    src = data.get("source", {})
    src_data = [
        [Paragraph("<b>Publisher:</b>", body_style), Paragraph(str(src.get("publisher", "N/A")), body_style),
         Paragraph("<b>Domain:</b>", body_style), Paragraph(str(src.get("domain", "N/A")), body_style)],
        [Paragraph("<b>Author:</b>", body_style), Paragraph(str(src.get("author", "N/A")), body_style),
         Paragraph("<b>Published:</b>", body_style), Paragraph(str(src.get("publication_date", "N/A")), body_style)],
        [Paragraph("<b>Source Status:</b>", body_style), Paragraph(str(src.get("source_status", "INFORMATIONAL")), body_style),
         Paragraph("<b>Input Type:</b>", body_style), Paragraph(str(data.get("input", {}).get("type", "article")).upper(), body_style)]
    ]
    t_src = Table(src_data, colWidths=[90, 175, 90, 175])
    t_src.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fafafa')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_src)
    story.append(Spacer(1, 15))

    # NLP Content Analysis
    story.append(Paragraph("2. NLP CONTENT & LINGUISTIC SIGNALS", h2_style))
    nlp = data.get("nlp", {})
    nlp_data = [
        [Paragraph("<b>Sentiment:</b>", body_style), Paragraph(f"{nlp.get('sentiment_label', 'Neutral')} ({nlp.get('sentiment_score', 0)})", body_style),
         Paragraph("<b>Subjectivity:</b>", body_style), Paragraph(f"{int(nlp.get('subjectivity_score', 0)*100)}%", body_style)],
        [Paragraph("<b>Clickbait Signal:</b>", body_style), Paragraph(f"{nlp.get('clickbait_signal', 'Low')} ({nlp.get('clickbait_score', 0)})", body_style),
         Paragraph("<b>Sensationalism:</b>", body_style), Paragraph(f"{nlp.get('sensationalism_signal', 'Medium')} ({nlp.get('sensationalism_score', 0)})", body_style)],
        [Paragraph("<b>Language Quality:</b>", body_style), Paragraph(f"{int(nlp.get('language_score', 0)*100)}%", body_style),
         Paragraph("<b>Semantic Match:</b>", body_style), Paragraph(f"{int(nlp.get('semantic_score', 0)*100)}%", body_style)]
    ]
    t_nlp = Table(nlp_data, colWidths=[110, 155, 110, 155])
    t_nlp.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fcfcfc')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_nlp)
    story.append(Spacer(1, 15))

    # AI Model Prediction vs Factual Verification
    story.append(Paragraph("3. AI PREDICTION VS. FACTUAL VERIFICATION", h2_style))
    pred = data.get("prediction", {})
    pred_text = f"<b>Real:</b> {int(pred.get('real_probability', 0)*100)}% &nbsp;|&nbsp; <b>Fake:</b> {int(pred.get('fake_probability', 0)*100)}% &nbsp;|&nbsp; <b>Misleading:</b> {int(pred.get('misleading_probability', 0)*100)}% &nbsp;|&nbsp; <b>Unverified:</b> {int(pred.get('unverified_probability', 0)*100)}%"
    story.append(Paragraph(pred_text, body_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Note: TruthLens AI strictly distinguishes statistical model probabilities from verified factual evidence to ensure transparency and accountability.</i>", subtitle_style))
    story.append(Spacer(1, 15))

    # Claims & Evidence
    story.append(Paragraph("4. EXTRACTED CLAIMS & CORROBORATING EVIDENCE", h2_style))
    claims = data.get("claims", [])
    if not claims:
        story.append(Paragraph("No discrete factual claims identified in submission.", body_style))
    else:
        for idx, clm in enumerate(claims[:3]):
            story.append(Paragraph(f"<b>Claim #{idx+1} [{clm.get('status', 'UNVERIFIED')}]:</b> \"{clm.get('claim_text', '')}\"", body_style))
            story.append(Spacer(1, 3))

    evd = data.get("evidence", [])
    if evd:
        story.append(Spacer(1, 5))
        story.append(Paragraph("<b>Primary Verified Evidence:</b>", body_style))
        for e in evd[:2]:
            story.append(Paragraph(f"• <b>{e.get('source_name', 'Source')}</b> [{e.get('relationship', 'SUPPORTS')}]: {e.get('evidence_text', '')}", body_style))
            story.append(Spacer(1, 3))

    story.append(Spacer(1, 15))

    # Why This Result
    story.append(Paragraph("5. EXPLANATION & AUDIT REASONING", h2_style))
    exp = data.get("explanation", {})
    points = exp.get("explanation", [])
    for p in points:
        story.append(Paragraph(f"• {p}", body_style))
        story.append(Spacer(1, 2))

    doc.build(story)
    buffer.seek(0)
    return buffer
