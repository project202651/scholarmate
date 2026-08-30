import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "ScholarMate - AI Learning Platform | Project Documentation")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "AANM & VVRSR Polytechnic College - Final Year Major Project (2026)")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def build_pdf():
    pdf_filename = "D:/scholarmate/ScholarMate_Project_Documentation.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#4F46E5")
    c_secondary = colors.HexColor("#7C3AED")
    c_dark = colors.HexColor("#0F172A")
    c_text = colors.HexColor("#334155")
    c_bg = colors.HexColor("#F8FAFC")
    
    # Custom Typography Styles
    style_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=c_primary,
        alignment=0,
        spaceAfter=10
    )
    
    style_subtitle = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#64748B"),
        alignment=0,
        spaceAfter=20
    )
    
    style_h1 = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_dark,
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )

    style_h2 = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    style_body = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=c_text,
        spaceAfter=8
    )

    style_bullet = ParagraphStyle(
        'Bullet_Custom',
        parent=style_body,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    style_code = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E293B"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#E2E8F0"),
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=8
    )

    story = []

    # ------------------ COVER HEADER ------------------
    story.append(Paragraph("ScholarMate - AI Learning Platform", style_title))
    story.append(Paragraph("Comprehensive Technical Documentation & System Reference Guide", style_subtitle))
    story.append(HRFlowable(width="100%", thickness=2, color=c_primary, spaceBefore=0, spaceAfter=15))
    
    # Metadata Table
    meta_data = [
        [Paragraph("<b>Project Name:</b>", style_body), Paragraph("ScholarMate AI Learning Platform", style_body)],
        [Paragraph("<b>Institution:</b>", style_body), Paragraph("AANM & VVRSR Polytechnic College", style_body)],
        [Paragraph("<b>Department:</b>", style_body), Paragraph("Diploma in Computer Engineering & Information Technology", style_body)],
        [Paragraph("<b>Project Type:</b>", style_body), Paragraph("Final Year Major Project (2026)", style_body)],
        [Paragraph("<b>Core Tech Stack:</b>", style_body), Paragraph("Node.js, Express, SQLite (sql.js), Google Gemini 2.5 Flash, Tesseract OCR", style_body)],
        [Paragraph("<b>Live Repository:</b>", style_body), Paragraph("https://github.com/project202651/scholarmate", style_body)]
    ]
    t_meta = Table(meta_data, colWidths=[120, 384])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))

    # ------------------ 1. EXECUTIVE SUMMARY & ABSTRACT ------------------
    story.append(Paragraph("1. Executive Summary & Project Abstract", style_h1))
    story.append(Paragraph(
        "<b>ScholarMate</b> is an advanced, AI-powered web learning platform engineered to revolutionize how students study from textbooks, lecture slides, and scanned notes. By uploading PDF textbooks or image photos, ScholarMate automatically extracts document text using high-performance PDF parsing and Optical Character Recognition (OCR), then leverages <b>Google Gemini 2.5 Flash</b> AI to transform raw content into structured study assets: <b>Executive Notes</b>, <b>Interactive 3D Flashcards</b>, and <b>Multiple Choice Quizzes</b>.",
        style_body
    ))
    story.append(Paragraph(
        "The system addresses a critical challenge in modern education: the time-consuming manual effort required to read lengthy textbooks, summarize core concepts, format study cards, and construct self-assessment exams. ScholarMate automates this entire pipeline in seconds.",
        style_body
    ))

    # ------------------ 2. SYSTEM ARCHITECTURE & DATA FLOW ------------------
    story.append(Paragraph("2. System Architecture & High-Level Pipeline", style_h1))
    story.append(Paragraph(
        "ScholarMate follows a modular 3-Tier Architecture comprising a client-side Single Page Application (SPA), a RESTful Express API gateway, and an AI/OCR processing engine backed by a WebAssembly SQLite database.",
        style_body
    ))
    
    flow_data = [
        [Paragraph("<b>Layer</b>", style_body), Paragraph("<b>Component</b>", style_body), Paragraph("<b>Responsibility</b>", style_body)],
        [Paragraph("Frontend", style_body), Paragraph("HTML5, CSS3, Vanilla JS", style_body), Paragraph("Renders SPA UI, 3D flip card animations, theme toggle, stats, & quiz runner.", style_body)],
        [Paragraph("API Server", style_body), Paragraph("Node.js + Express.js", style_body), Paragraph("Handles JWT auth, multer file uploads, route dispatches, and CORS security.", style_body)],
        [Paragraph("Text Extraction", style_body), Paragraph("pdf-parse & Tesseract.js", style_body), Paragraph("Extracts text from selectable PDFs and runs OCR on scanned image files.", style_body)],
        [Paragraph("AI Generation", style_body), Paragraph("Google Gemini 2.5 Flash", style_body), Paragraph("Synthesizes deep JSON notes, flashcards, & MCQs from document text.", style_body)],
        [Paragraph("Database", style_body), Paragraph("SQLite (sql.js WASM)", style_body), Paragraph("Stores users, upload library, notes, cards, and quiz scores without native C++ deps.", style_body)]
    ]
    t_flow = Table(flow_data, colWidths=[80, 140, 284])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0,3), (-1,3), colors.white),
        ('BACKGROUND', (0,4), (-1,4), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0,5), (-1,5), colors.white),
    ]))
    story.append(t_flow)
    story.append(Spacer(1, 15))

    # ------------------ 3. CORE MODULES & FEATURES ------------------
    story.append(Paragraph("3. Core Modules & Key Features", style_h1))
    
    story.append(Paragraph("A. Document Parsing & Dual OCR Fallback Engine", style_h2))
    story.append(Paragraph("ScholarMate handles both digital PDFs and physical scanned textbook photos:", style_body))
    story.append(Paragraph("• <b>Digital PDFs:</b> Extracted using <code>pdf-parse</code> for maximum accuracy and speed.", style_bullet))
    story.append(Paragraph("• <b>Scanned Image PDFs & Photos:</b> Automatically triggers <code>Tesseract.js</code> OCR when selectable text is missing.", style_bullet))
    story.append(Paragraph("• <b>Full Document Window:</b> Preserves up to 500,000 characters (~125,000 words), ensuring complete textbook coverage without cutting off middle or ending chapters.", style_bullet))

    story.append(Paragraph("B. AI Notes Generation Engine", style_h2))
    story.append(Paragraph("Transforms raw document text into structured, high-yield study notes containing:", style_body))
    story.append(Paragraph("• <b>Executive Summary:</b> 3 comprehensive paragraphs detailing core background & significance.", style_bullet))
    story.append(Paragraph("• <b>Key Takeaways:</b> 15-20 bullet points highlighting exact definitions, formulas, and theorems.", style_bullet))
    story.append(Paragraph("• <b>Exam Questions & Solutions:</b> Realistic conceptual questions paired with thorough answers.", style_bullet))
    story.append(Paragraph("• <b>One-Click Export:</b> Allows students to download notes as clean <code>.txt</code> files.", style_bullet))

    story.append(Paragraph("C. Interactive 3D Flip Flashcards Carousel", style_h2))
    story.append(Paragraph("• <b>3D CSS Flip Effect:</b> Cards flip seamlessly with CSS <code>preserve-3d</code> perspective.", style_bullet))
    story.append(Paragraph("• <b>Interactive Controls:</b> Previous/Next buttons, Deck Shuffle (Fisher-Yates algorithm), and Card Counter.", style_bullet))
    story.append(Paragraph("• <b>Keyboard Shortcuts:</b> Press <b>Spacebar</b> to flip cards and <b>Left/Right Arrow keys</b> to navigate.", style_bullet))

    story.append(Paragraph("D. Interactive MCQ Quiz & Scoring Engine", style_h2))
    story.append(Paragraph("• <b>10-Question Exams:</b> Generates multiple-choice questions covering all document chapters.", style_bullet))
    story.append(Paragraph("• <b>Real-Time Scoring:</b> Computes percentage score with instant answer key feedback.", style_bullet))
    story.append(Paragraph("• <b>AI Explanations:</b> Explains why the correct option is right for every question.", style_bullet))

    story.append(Paragraph("E. Smart Local Fallback Engine (Zero API Key Blockage)", style_h2))
    story.append(Paragraph("• When <code>GEMINI_API_KEY</code> is configured in <code>.env</code>, ScholarMate uses <b>Google Gemini 2.5 Flash</b>.", style_bullet))
    story.append(Paragraph("• If no API key is set, the system automatically falls back to an intelligent local text analyzer that samples sentences evenly across all document sections, ensuring zero downtime or error popups.", style_bullet))

    # ------------------ 4. DATABASE SCHEMA ------------------
    story.append(Paragraph("4. Relational Database Schema (SQLite via sql.js WASM)", style_h1))
    story.append(Paragraph(
        "ScholarMate utilizes <code>sql.js</code> (WebAssembly SQLite) to provide synchronous database operations with zero native C++ compiler dependencies. Tables are auto-created and persisted to <code>scholarmate.db</code>:",
        style_body
    ))

    db_code = """-- Database Schema Overview (scholarmate.db)

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    extracted_text TEXT NOT NULL,
    page_count INTEGER DEFAULT 1,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    summary TEXT NOT NULL,
    bullet_points TEXT NOT NULL,       -- Stored as JSON string
    important_questions TEXT NOT NULL, -- Stored as JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    cards_json TEXT NOT NULL,          -- Array of {front, back} JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    questions_json TEXT NOT NULL,      -- Array of MCQ questions JSON
    score INTEGER DEFAULT NULL,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);"""
    story.append(Paragraph(db_code.replace("\n", "<br/>").replace(" ", "&nbsp;"), style_code))

    # ------------------ 5. DEPLOYMENT & EXECUTION GUIDE ------------------
    story.append(Paragraph("5. Local Execution & Cloud Deployment Guide", style_h1))
    
    story.append(Paragraph("Local Setup Instructions:", style_h2))
    setup_code = """# 1. Clone & Install
git clone https://github.com/project202651/scholarmate.git
cd scholarmate
npm install

# 2. Configure Environment (.env)
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=scholarmate_secret_key_2026

# 3. Start Application
npm start
# Server runs live on http://localhost:3000"""
    story.append(Paragraph(setup_code.replace("\n", "<br/>").replace(" ", "&nbsp;"), style_code))

    story.append(Paragraph("Free Cloud Deployment (Render.com):", style_h2))
    story.append(Paragraph("1. Sign up on <b>Render.com</b> and connect your GitHub repository.", style_bullet))
    story.append(Paragraph("2. Select <b>Web Service</b> with Runtime: <code>Node</code>, Build Command: <code>npm install</code>, Start Command: <code>npm start</code>.", style_bullet))
    story.append(Paragraph("3. Add Environment Variable <code>GEMINI_API_KEY</code> and click <b>Deploy</b>.", style_bullet))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {pdf_filename}")

if __name__ == "__main__":
    build_pdf()
