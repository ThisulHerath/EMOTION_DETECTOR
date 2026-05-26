import { useRef, useState, useEffect, useCallback } from "react";
import "./App.css";

const EMOTION_EMOJIS = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  surprised: "😲",
  fear: "😨",
  disgust: "🤢",
  neutral: "😐",
};

const EMOTION_COLORS = {
  happy: "#FFD700",
  sad: "#4A90D9",
  angry: "#FF4444",
  surprised: "#FF9500",
  fear: "#9B59B6",
  disgust: "#2ECC71",
  neutral: "#95A5A6",
};

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [emotion, setEmotion] = useState(null);
  const [emotions, setEmotions] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const intervalRef = useRef(null);

  // Start webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;
      setIsRunning(true);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg("Camera access denied. Please allow camera access.");
    }
  };

  // Stop webcam
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setEmotion(null);
    setEmotions({});
    setStatus("");
  };

  // Capture frame and send to backend
  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.videoWidth === 0) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setLoading(true);

      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      try {
        const response = await fetch("http://127.0.0.1:8000/analyze", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (data.status === "success") {
          setEmotion(data.dominant_emotion);
          setEmotions(data.emotions);
          setStatus("success");
        } else if (data.status === "no_face") {
          setStatus("no_face");
          setEmotion(null);
          setEmotions({});
        }
      } catch (err) {
        setErrorMsg("Cannot connect to backend. Is it running?");
      } finally {
        setLoading(false);
      }
    }, "image/jpeg");
  }, []);

  // Analyze every 2 seconds while running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(analyzeFrame, 2000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, analyzeFrame]);

  const dominantColor =
    emotion ? EMOTION_COLORS[emotion] || "#667eea" : "#667eea";

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <h1 className="title">🧠 Emotion Detector</h1>
        <p className="subtitle">
          Real-time facial emotion recognition powered by AI
        </p>
      </div>

      {errorMsg && (
        <div className="error-banner">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="main-container">
        {/* Left — Camera */}
        <div className="camera-section">
          <div
            className="video-wrapper"
            style={{ borderColor: dominantColor }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-feed"
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {!isRunning && (
              <div className="camera-placeholder">
                <div className="camera-icon">📷</div>
                <p>Camera is off</p>
                <span>Click Start to begin</span>
              </div>
            )}

            {loading && isRunning && (
              <div className="analyzing-badge">
                <span className="dot" />
                Analyzing...
              </div>
            )}

            {status === "no_face" && isRunning && (
              <div className="no-face-badge">
                👤 No face detected
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="controls">
            {!isRunning ? (
              <button className="btn start-btn" onClick={startCamera}>
                ▶ Start Camera
              </button>
            ) : (
              <button className="btn stop-btn" onClick={stopCamera}>
                ⏹ Stop Camera
              </button>
            )}
          </div>

          {/* Info */}
          <div className="info-box">
            <p>💡 Make sure you are in good lighting</p>
            <p>📸 Face the camera directly for best results</p>
          </div>
        </div>

        {/* Right — Results */}
        <div className="results-section">
          <h2 className="results-title">Detection Results</h2>

          {emotion && status === "success" ? (
            <>
              {/* Dominant Emotion Card */}
              <div
                className="dominant-emotion"
                style={{
                  backgroundColor: dominantColor + "22",
                  borderColor: dominantColor,
                  boxShadow: `0 0 30px ${dominantColor}33`,
                }}
              >
                <span className="emotion-emoji">
                  {EMOTION_EMOJIS[emotion] || "🤔"}
                </span>
                <span
                  className="emotion-label"
                  style={{ color: dominantColor }}
                >
                  {emotion.toUpperCase()}
                </span>
                <span className="emotion-sublabel">Dominant Emotion</span>
              </div>

              {/* All Emotion Bars */}
              <div className="emotion-bars">
                <h3>Emotion Breakdown</h3>
                {Object.entries(emotions)
                  .sort((a, b) => b[1] - a[1])
                  .map(([emo, score]) => (
                    <div key={emo} className="bar-row">
                      <span className="bar-label">
                        {EMOTION_EMOJIS[emo] || "🤔"}{" "}
                        <span className="bar-name">{emo}</span>
                      </span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${Math.min(score, 100)}%`,
                            backgroundColor:
                              EMOTION_COLORS[emo] || "#667eea",
                          }}
                        />
                      </div>
                      <span className="bar-value">{score.toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="no-result">
              {isRunning ? (
                <>
                  <div className="scanning-animation">🔍</div>
                  <p>Scanning for faces...</p>
                  <span>Make sure your face is visible</span>
                </>
              ) : (
                <>
                  <div className="scanning-animation">🧠</div>
                  <p>Ready to detect emotions</p>
                  <span>Start the camera to begin</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}