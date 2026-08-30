# ScholarMate - AI Learning Platform 🎓✨

**ScholarMate** is an AI-powered learning platform built for students to upload textbooks (PDFs or image photos) and automatically extract text to generate comprehensive **Notes**, **3D Flashcards**, and **Interactive Quizzes**.

Final Year Project | **AANM & VVRSR Polytechnic College** (Department of Computer Engineering)

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (Light/Dark Mode, Startup Animation) |
| **Backend** | Node.js + Express.js |
| **Database** | SQLite via `sql.js` (WebAssembly - Zero Native Build Dependencies) |
| **File Upload** | `multer` |
| **PDF Text Extraction** | `pdf-parse` |
| **Image OCR** | `tesseract.js` |
| **AI Generation Engine** | Google Gemini API (`@google/genai`, model: `gemini-2.5-flash`) + Smart Local Fallback |
| **Auth** | `bcryptjs` password hashing & `jsonwebtoken` (JWT) |

---

## 🛠️ Features

- 📑 **PDF & Image OCR Parsing**: Automatically extracts text from uploaded textbooks and notes.
- 📝 **AI Study Notes**: Generates executive summaries, key takeaway bullet points, and exam Q&A with one-click `.txt` export.
- 🃏 **3D Flip Flashcards**: Interactive 3D flip card viewer with deck shuffling and keyboard shortcuts (Spacebar to flip, Arrow keys to navigate).
- 📋 **Interactive MCQ Quizzes**: 10-question practice exams with real-time scoring and answer key explanations.
- 🎨 **Startup Animation & Theme Toggle**: Smooth startup logo reveal and dark/light mode toggle.
- 🛡️ **Dual AI Engine**: Uses Google Gemini 2.5 Flash when API key is provided, with intelligent local text fallback if no API key is set.

---

## 📦 Local Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/scholarmate.git
   cd scholarmate
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey):
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   JWT_SECRET=scholarmate_secret_key_2026
   ```

4. **Start the Server**:
   ```bash
   npm start
   ```

5. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 👥 Project Team

- **AANM & VVRSR Polytechnic College**
- Diploma in Computer Engineering / IT (Final Year Major Project 2026)
