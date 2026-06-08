import { useRef, useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

const EMOTION_EMOJIS = {
  happy: "😊", sad: "😢", angry: "😠",
  surprised: "😲", fear: "😨", disgust: "🤢", neutral: "😐",
};

const EMOTION_COLORS = {
  happy: "#f9c74f", sad: "#4cc9f0", angry: "#f72585",
  surprised: "#ff9500", fear: "#7b2d8b", disgust: "#43aa8b", neutral: "#6c757d",
};

const EMOTION_BG = {
  happy: "#f9c74f18", sad: "#4cc9f018", angry: "#f7258518",
  surprised: "#ff950018", fear: "#7b2d8b18", disgust: "#43aa8b18", neutral: "#6c757d18",
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
  const [mode, setMode] = useState("desktop"); // "desktop" | "qr"
  const [localIP, setLocalIP] = useState("");
  const [showQRPanel, setShowQRPanel] = useState(false);
  const intervalRef = useRef(null);

  // Get local IP for QR code
  useEffect(() => {
    // Use current hostname - works for both localhost and LAN
    const host = window.location.hostname;
    const port = window.location.port || "5173";
    setLocalIP(`http://${host}:${port}/mobile`);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setIsRunning(true);
      setErrorMsg("");
    } catch {
      setErrorMsg("Camera access denied. Please allow camera access.");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setEmotion(null);
    setEmotions({});
    setStatus("");
  };

  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.videoWidth === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setLoading(true);
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");
      try {
        // Use same hostname as frontend (works for localhost and network IPs)
        const backendHost = window.location.hostname;
        const backendPort = "8000";
        const backendUrl = `http://${backendHost}:${backendPort}/analyze`;
        const res = await fetch(backendUrl, {
          method: "POST", body: formData,
        });
        const data = await res.json();
        if (data.status === "success") {
          setEmotion(data.dominant_emotion);
          setEmotions(data.emotions);
          setStatus("success");
        } else if (data.status === "no_face") {
          setStatus("no_face");
          setEmotion(null);
          setEmotions({});
        }
      } catch {
        setErrorMsg("Cannot connect to backend. Is it running on port 8000?");
      } finally {
        setLoading(false);
      }
    }, "image/jpeg");
  }, []);

  useEffect(() => {
    if (isRunning) intervalRef.current = setInterval(analyzeFrame, 2000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, analyzeFrame]);

  const dominantColor = emotion ? EMOTION_COLORS[emotion] || "#a78bfa" : "#a78bfa";
  const dominantBG = emotion ? EMOTION_BG[emotion] || "#a78bfa18" : "transparent";

  // Mobile QR page
  if (window.location.pathname === "/mobile") {
    return <MobilePage />;
  }

  return (
    <div className="app">
      {/* Background effects */}
      <div className="bg-orb orb1" />
      <div className="bg-orb orb2" />
      <div className="bg-grid" />

      {/* Header */}
      <header className="header">
        <div className="header-badge">AI POWERED</div>
        <h1 className="title">
          <span className="title-main">Emotion</span>
          <span className="title-accent">Detector</span>
        </h1>
        <p className="subtitle">Real-time facial emotion recognition</p>

        {/* Mode Switcher */}
        <div className="mode-switcher">
          <button
            className={`mode-btn ${mode === "desktop" ? "active" : ""}`}
            onClick={() => { setMode("desktop"); setShowQRPanel(false); }}
          >
            💻 Desktop Camera
          </button>
          <button
            className={`mode-btn ${mode === "qr" ? "active" : ""}`}
            onClick={() => { setMode("qr"); setShowQRPanel(true); if (isRunning) stopCamera(); }}
          >
            📱 Use Phone Camera
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="error-banner">⚠️ {errorMsg}</div>
      )}

      {/* QR Panel */}
      {mode === "qr" && (
        <div className="qr-panel">
          <div className="qr-panel-inner">
            <div className="qr-left">
              <h2>Scan with your phone</h2>
              <p>Open your phone camera and scan this QR code to use your phone's camera for emotion detection</p>
              <div className="qr-steps">
                <div className="qr-step">
                  <span className="step-num">1</span>
                  <span>Open your phone camera app</span>
                </div>
                <div className="qr-step">
                  <span className="step-num">2</span>
                  <span>Point it at the QR code</span>
                </div>
                <div className="qr-step">
                  <span className="step-num">3</span>
                  <span>Tap the notification to open</span>
                </div>
                <div className="qr-step">
                  <span className="step-num">4</span>
                  <span>Allow camera access on your phone</span>
                </div>
              </div>
              <div className="qr-note">
                ⚠️ Make sure your phone is on the <strong>same WiFi network</strong> as this computer
              </div>
              <div className="ip-display">
                <span className="ip-label">URL:</span>
                <span className="ip-value">
                  Replace "localhost" with your computer's local IP address (e.g. 192.168.1.x:5173/mobile)
                </span>
              </div>
            </div>
            <div className="qr-right">
              <div className="qr-code-wrapper">
                <QRCodeSVG
                  value={localIP}
                  size={220}
                  bgColor="transparent"
                  fgColor="#a78bfa"
                  level="H"
                />
                <div className="qr-label">Scan Me</div>
              </div>
              <button
                className="manual-url-btn"
                onClick={() => navigator.clipboard?.writeText(localIP)}
              >
                📋 Copy URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout — Desktop Mode */}
      {mode === "desktop" && (
        <div className="main-container">
          {/* Camera */}
          <div className="camera-section">
            <div className="camera-card" style={{ "--glow": dominantColor }}>
              <div className="camera-label">LIVE FEED</div>
              <div className="video-wrapper" style={{ borderColor: isRunning ? dominantColor : "#2a2a3e" }}>
                <video ref={videoRef} autoPlay playsInline muted className="video-feed" />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {!isRunning && (
                  <div className="camera-placeholder">
                    <div className="camera-icon-wrap">
                      <span className="camera-icon">📷</span>
                    </div>
                    <p>Camera Offline</p>
                    <span>Press Start to activate</span>
                  </div>
                )}

                {loading && isRunning && (
                  <div className="analyzing-badge">
                    <span className="scan-dot" />
                    Analyzing
                  </div>
                )}

                {status === "no_face" && isRunning && !loading && (
                  <div className="no-face-badge">👤 No face detected</div>
                )}

                {isRunning && (
                  <div className="corner-brackets">
                    <span className="bracket tl" />
                    <span className="bracket tr" />
                    <span className="bracket bl" />
                    <span className="bracket br" />
                  </div>
                )}
              </div>

              <div className="controls">
                {!isRunning ? (
                  <button className="btn start-btn" onClick={startCamera}>
                    <span className="btn-icon">▶</span> Start Camera
                  </button>
                ) : (
                  <button className="btn stop-btn" onClick={stopCamera}>
                    <span className="btn-icon">⏹</span> Stop Camera
                  </button>
                )}
              </div>

              <div className="tips-row">
                <span className="tip">💡 Good lighting helps</span>
                <span className="tip">👁 Face camera directly</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="results-section">
            <div className="results-header">DETECTION RESULTS</div>

            {emotion && status === "success" ? (
              <div className="results-content">
                {/* Dominant Card */}
                <div
                  className="dominant-card"
                  style={{ background: dominantBG, borderColor: dominantColor, boxShadow: `0 0 40px ${dominantColor}22` }}
                >
                  <div className="dominant-emoji">{EMOTION_EMOJIS[emotion] || "🤔"}</div>
                  <div className="dominant-label" style={{ color: dominantColor }}>
                    {emotion.toUpperCase()}
                  </div>
                  <div className="dominant-sub">Dominant Emotion Detected</div>

                  {/* Confidence ring */}
                  <div className="confidence-ring" style={{ "--color": dominantColor, "--pct": `${(emotions[emotion] || 0).toFixed(0)}` }}>
                    <span className="confidence-num">{(emotions[emotion] || 0).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Bars */}
                <div className="bars-card">
                  <div className="bars-title">EMOTION BREAKDOWN</div>
                  {Object.entries(emotions)
                    .sort((a, b) => b[1] - a[1])
                    .map(([emo, score]) => (
                      <div key={emo} className="bar-row">
                        <span className="bar-emoji">{EMOTION_EMOJIS[emo] || "🤔"}</span>
                        <span className="bar-name">{emo}</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{ width: `${Math.min(score, 100)}%`, background: EMOTION_COLORS[emo] || "#a78bfa" }}
                          />
                        </div>
                        <span className="bar-pct">{score.toFixed(1)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="idle-state">
                <div className="idle-icon">
                  {isRunning ? "🔍" : "🧠"}
                </div>
                <p>{isRunning ? "Scanning for faces..." : "Ready to detect emotions"}</p>
                <span>{isRunning ? "Position your face in the camera" : "Start the camera to begin"}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile page - opens when phone scans QR
function MobilePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [emotion, setEmotion] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const backendURL = `http://${window.location.hostname}:8000/analyze`;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      videoRef.current.srcObject = stream;
      setIsRunning(true);
    } catch {
      alert("Camera access denied");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setEmotion(null);
  };

  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.videoWidth === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setLoading(true);
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");
      try {
        const res = await fetch(backendURL, { method: "POST", body: formData });
        const data = await res.json();
        if (data.status === "success") setEmotion(data.dominant_emotion);
      } catch { } finally {
        setLoading(false);
      }
    }, "image/jpeg");
  }, [backendURL]);

  useEffect(() => {
    if (isRunning) intervalRef.current = setInterval(analyzeFrame, 2000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, analyzeFrame]);

  const EMOJIS = { happy:"😊", sad:"😢", angry:"😠", surprised:"😲", fear:"😨", disgust:"🤢", neutral:"😐" };
  const COLORS = { happy:"#f9c74f", sad:"#4cc9f0", angry:"#f72585", surprised:"#ff9500", fear:"#7b2d8b", disgust:"#43aa8b", neutral:"#6c757d" };

  return (
    <div className="mobile-app">
      <div className="mobile-header">
        <span>🧠</span>
        <h1>Emotion Detector</h1>
      </div>

      <div className="mobile-video-wrap" style={{ borderColor: emotion ? COLORS[emotion] : "#333" }}>
        <video ref={videoRef} autoPlay playsInline muted className="mobile-video" />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {!isRunning && (
          <div className="mobile-placeholder">📷<br />Camera Off</div>
        )}
        {loading && <div className="mobile-badge">Analyzing...</div>}
      </div>

      {emotion && (
        <div className="mobile-result" style={{ borderColor: COLORS[emotion] }}>
          <span style={{ fontSize: "3rem" }}>{EMOJIS[emotion]}</span>
          <span style={{ color: COLORS[emotion], fontSize: "1.5rem", fontWeight: 800 }}>
            {emotion.toUpperCase()}
          </span>
        </div>
      )}

      <div className="mobile-controls">
        {!isRunning ? (
          <button className="mobile-btn start" onClick={startCamera}>▶ Start</button>
        ) : (
          <button className="mobile-btn stop" onClick={stopCamera}>⏹ Stop</button>
        )}
      </div>
    </div>
  );
}