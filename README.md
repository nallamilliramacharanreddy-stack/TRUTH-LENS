# TruthLens AI - Misinformation & Fake News Detection System

TruthLens AI is an end-to-end NLP & Machine Learning system designed to identify, verify, and explain fake news, misinformation, clickbait, and sensationalism in real time.

---

## 🌟 Key Features

1. **Multi-Modal Verification Workbench**:
   - Single Headline / Statement Fact-Checking
   - Full News Article In-Depth Analysis
   - Image & Phone Gallery Upload with Optical Character Recognition (OCR)
   - PDF & Document Analysis
   - Live URL Ingestion & Web Scraping

2. **Kaggle ISOT Fake & Real News Dataset Evaluator**:
   - High-accuracy ML pipeline trained on authentic news articles (>97% model test accuracy)
   - Batch evaluation supporting CSV, TSV, JSON, JSONL, Excel (`.xlsx`), PDF, and `.zip` archives
   - 1-Click Kaggle 25,200 Benchmark Runner with ground truth validation (93% benchmark accuracy)
   - Kaggle Croissant Schema auto-detection

3. **Multi-Source Evidence Corroboration**:
   - Live real-time search across Wikipedia Encyclopedia and Google News
   - Strict debunk marker detection (`fact check`, `false`, `hoax`, `debunk`) to prevent false positives

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```
*(Optional for OCR)* Install Tesseract on your system:
- **macOS**: `brew install tesseract`
- **Ubuntu/Debian**: `sudo apt install tesseract-ocr`
- **Windows**: Install Tesseract from GitHub UB-Mannheim

### 2. Start the Server
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Open in Browser
- **Home Page**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Live Verifier**: [http://127.0.0.1:8000/detect.html](http://127.0.0.1:8000/detect.html)
- **Dataset Evaluator**: [http://127.0.0.1:8000/dataset.html](http://127.0.0.1:8000/dataset.html)
- **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
