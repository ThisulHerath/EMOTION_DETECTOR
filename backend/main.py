from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fer import FER
import numpy as np
import cv2
import io
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize FER detector
detector = FER(mtcnn=False)

@app.get("/")
def root():
    return {"message": "Emotion Detection API is running"}

@app.post("/analyze")
async def analyze_emotion(file: UploadFile = File(...)):
    try:
        # Read image sent from frontend
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        frame = np.array(image)
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        # Detect emotions using FER
        result = detector.detect_emotions(frame)

        if not result:
            return {
                "dominant_emotion": "No face detected",
                "emotions": {},
                "status": "no_face"
            }

        # Get first face detected
        emotions = result[0]["emotions"]

        # Find dominant emotion
        dominant = max(emotions, key=emotions.get)

        # Convert to percentages
        emotions_percent = {k: round(v * 100, 2) for k, v in emotions.items()}

        return {
            "dominant_emotion": dominant,
            "emotions": emotions_percent,
            "status": "success"
        }

    except Exception as e:
        return {
            "dominant_emotion": "error",
            "emotions": {},
            "status": "error",
            "message": str(e)
        }