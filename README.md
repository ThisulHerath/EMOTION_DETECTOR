# Emotion Detector

Simple web app (FastAPI backend + React + Vite frontend) that detects facial emotions from uploaded images using the fer library and OpenCV.

## Features
- REST API to analyze an uploaded image for emotions
- Returns dominant emotion and per-emotion confidence percentages
- Minimal React + Vite frontend to upload images and display results

## Repository Structure

- `backend/` — FastAPI backend server and model inference code
- `frontend/` — React + Vite single-page app

## Prerequisites
- Python 3.8+ (recommended)
- Node.js 16+ and npm or yarn
- On Windows, installing OpenCV can require a wheel; using `opencv-python` or `opencv-python-headless` via pip is recommended.

## Backend Setup (Python)

1. Create a virtual environment and activate it:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # PowerShell
# or use: .\.venv\Scripts\activate.bat for cmd
```

2. Install dependencies (there is no pinned `requirements.txt`; install these packages):

```powershell
pip install fastapi uvicorn fer opencv-python numpy pillow
```

3. Run the backend server:

```powershell
# From repository root
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The backend exposes two endpoints:
- `GET /` — health check, returns a small JSON message
- `POST /analyze` — accepts `multipart/form-data` with a `file` field (image) and returns detected emotions. Example response:

```json
{
  "dominant_emotion": "happy",
  "emotions": {"happy": 95.0, "sad": 0.5, "neutral": 4.5},
  "status": "success"
}
```

Example `curl` request:

```bash
curl -X POST "http://localhost:8000/analyze" -F "file=@/path/to/image.jpg"
```

Or a simple JavaScript `fetch` example used by the frontend:

```js
const form = new FormData();
form.append('file', fileInput.files[0]);
const res = await fetch('http://localhost:8000/analyze', { method: 'POST', body: form });
const data = await res.json();
console.log(data);
```

## Frontend Setup (React + Vite)

1. Install node dependencies:

```bash
cd frontend
npm install
# or: yarn
```

2. Run the dev server:

```bash
npm run dev
```

By default, Vite serves the app at `http://localhost:5173` (unless configured otherwise).

The frontend should be configured to send the image to `http://localhost:8000/analyze`. If CORS errors appear, ensure the backend is running and the CORS policy allows requests from the frontend origin.

## Notes & Troubleshooting
- If you see errors related to `fer` or MTCNN, try installing optional dependencies or setting `mtcnn=False` (the backend already initializes `FER(mtcnn=False)`).
- On Windows, `opencv-python` wheels are commonly available; if you encounter build errors, install a pre-built wheel or try `pip install opencv-python-headless`.
- If the API returns `{"status":"no_face"}`, the image did not contain a detectable face.

## Extending or Improving
- Add model caching or batching for higher throughput
- Replace `fer` with a custom trained model for improved accuracy
- Add tests for backend endpoints and frontend components

## Contributing
- Fork the repo, create a feature branch, and open a PR describing your changes.

## License
This project is provided as-is. Add a license file if you wish to apply specific licensing terms.
