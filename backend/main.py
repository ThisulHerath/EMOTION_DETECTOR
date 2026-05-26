from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import numpy as np
import cv2
import io
from PLI import Image

app = FastAPI()

app.add.middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Adjust this to your frontend URL
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

@app.get("/")
def root():
    return {"message" : "Emotion Detection API is running"}

@app.post("/analyze")
async def analyze_emotion(file: UploadFile = File(...)):
    try :
        #read image from frontend
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        frame = np.array(image)
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        #analyze emption using DeepFace
        result = DeepFace.analyze(
            frame,
            actions=["emotion"],
            enforce_detection = False
        )

        #extract emotion data
        emotions = result[0]["emotion"]
        dominant = result[0]["dominant_emotion"]

        return{
            "dominant_emotion" : dominant,
            "emotions" : emotions,
            "status" : "success"
        }
    except Exception as e:
        return{
            "dominant_emotion" : "unknown",
            "emotions" : {},
            "status" : "error",
            "message" : str(e)
        }