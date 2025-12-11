// src/pages/VirtualClassroomPage.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  IconButton,
  TextField,
  Button,
  Paper,
  CircularProgress,
} from "@mui/material";
import {
  Delete,
  Send,
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
} from "@mui/icons-material";
import { aiChat } from "../api";
import { Role } from "../types";

interface VirtualClassroomPageProps {
  role: Role;
}

const VirtualClassroomPage: React.FC<VirtualClassroomPageProps> = ({ role }) => {
  const isTutor = role === "Tutor";

  // ----- Session key (fake “room” for hackathon demo) -----
  const [sessionKey, setSessionKey] = useState<string>("");
  const [inputKey, setInputKey] = useState<string>("");
  const [joined, setJoined] = useState(false);

  // ----- Camera / Mic -----
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [startingMedia, setStartingMedia] = useState(false);

  // ----- Whiteboard -----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textYRef = useRef<number>(28);
  const [whiteboardText, setWhiteboardText] = useState("");

  // ----- Chat -----
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{ from: string; text: string }[]>([]);

  // ----- AI Q&A -----
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  // =======================================================
  // SESSION KEY LOGIC (fake room)
  // =======================================================
  const generateSessionKey = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSessionKey(code);
    setJoined(true); // tutor auto joins
  };

  const handleJoinWithKey = () => {
    if (!inputKey.trim()) return;
    if (inputKey.trim() === sessionKey) {
      setJoined(true);
    } else {
      setChatLog((prev) => [
        ...prev,
        { from: "System", text: "Invalid session code." },
      ]);
    }
  };

  const leaveSession = () => {
    setJoined(false);
    stopMedia();
  };

  // =======================================================
  // CAMERA + MIC
  // =======================================================
  const startMedia = async () => {
    if (startingMedia || !joined) return;
    setStartingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setVideoOn(true);
      setAudioOn(true);
    } catch (err) {
      console.error("Media error:", err);
      setChatLog((prev) => [
        ...prev,
        { from: "System", text: "Camera/mic error. Check permissions." },
      ]);
    } finally {
      setStartingMedia(false);
    }
  };

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoOn(false);
    setAudioOn(false);
  };

  const toggleVideo = () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    const enabled = !videoTrack.enabled;
    videoTrack.enabled = enabled;
    setVideoOn(enabled);
  };

  const toggleAudio = () => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;
    const enabled = !audioTrack.enabled;
    audioTrack.enabled = enabled;
    setAudioOn(enabled);
  };

  useEffect(() => {
    return () => {
      stopMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================================================
  // WHITEBOARD (mouse draw + typed text)
  // =======================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";

    let drawing = false;

    const startDraw = (e: MouseEvent) => {
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };

    const draw = (e: MouseEvent) => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    };

    const endDraw = () => {
      drawing = false;
      ctx.closePath();
    };

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
    };
  }, []);

  const clearBoard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      textYRef.current = 28;
    }
  };

  const addTextToBoard = () => {
    if (!whiteboardText.trim() || !isTutor) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.font = "16px 'Fira Code', monospace";
    ctx.fillStyle = "#F58F29"; // Jac orange
    const lines = whiteboardText.split("\n");

    lines.forEach((line) => {
      ctx.fillText(line, 16, textYRef.current);
      textYRef.current += 22;
      if (textYRef.current > canvas.height - 16) {
        textYRef.current = 28;
      }
    });

    setWhiteboardText("");
  };

  // =======================================================
  // CHAT
  // =======================================================
  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatLog((prev) => [
      ...prev,
      { from: isTutor ? "Tutor" : "Student", text },
    ]);
    setChatInput("");
  };

  // =======================================================
  // AI Q&A
  // =======================================================
  const askAI = async () => {
    const q = question.trim();
    if (!q) return;

    setLoadingAnswer(true);
    setAnswers((prev) => [
      ...prev,
      `${isTutor ? "Tutor" : "Student"}: ${q}`,
    ]);

    try {
      const prompt =
        "You are an AI tutor in a Jac programming classroom. " +
        "Give a clear, step-by-step answer. Keep code snippets short.\n\n" +
        "Question: " +
        q;
      const reply = await aiChat(prompt);
      setAnswers((prev) => [...prev, `AI: ${reply}`]);
    } catch (e) {
      console.error(e);
      setAnswers((prev) => [
        ...prev,
        "AI: I cannot answer right now. Please try again later.",
      ]);
    } finally {
      setQuestion("");
      setLoadingAnswer(false);
    }
  };

  // =======================================================
  // RENDER
  // =======================================================
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Virtual Classroom
      </Typography>
      <Typography variant="subtitle1" color="grey.400" gutterBottom>
        Session code, camera, whiteboard, chat, and AI.
      </Typography>

      {/* TOP: Session + Video + Whiteboard */}
      <Box display="flex" gap={3} mt={2} flexWrap="wrap">
        {/* Session + Video */}
        <Card sx={{ flexBasis: 420, flexGrow: 1, minWidth: 360 }}>
          <CardHeader
            title="Session & Camera"
            subheader={isTutor ? "Create a code and share it." : "Enter the code from your tutor."}
          />
          <CardContent>
            {/* Session row */}
            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
              {isTutor ? (
                <>
                  <Button
                    variant="contained"
                    onClick={generateSessionKey}
                    disabled={!!sessionKey}
                  >
                    {sessionKey ? "Session Created" : "Create Session"}
                  </Button>
                  {sessionKey && (
                    <Typography variant="body2" sx={{ alignSelf: "center" }}>
                      Code: <strong>{sessionKey}</strong>
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <TextField
                    size="small"
                    label="Session code"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    onClick={handleJoinWithKey}
                    disabled={joined}
                  >
                    Join
                  </Button>
                </>
              )}
              {joined && (
                <Button
                  variant="text"
                  color="inherit"
                  onClick={leaveSession}
                  sx={{ ml: "auto" }}
                >
                  Leave Session
                </Button>
              )}
            </Box>

            {/* Video area */}
            <Box
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.06)",
                bgcolor: "black",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: 260,
                  background: "#000",
                }}
              />
            </Box>

            {/* Video controls */}
            <Box display="flex" gap={1} mt={2}>
              {!streamRef.current ? (
                <Button
                  variant="contained"
                  onClick={startMedia}
                  disabled={!joined || startingMedia}
                >
                  {startingMedia ? (
                    <CircularProgress size={18} />
                  ) : (
                    "Start Camera & Mic"
                  )}
                </Button>
              ) : (
                <Button variant="outlined" onClick={stopMedia}>
                  Stop
                </Button>
              )}

              <IconButton
                color={videoOn ? "primary" : "default"}
                onClick={toggleVideo}
                disabled={!streamRef.current}
              >
                {videoOn ? <Videocam /> : <VideocamOff />}
              </IconButton>
              <IconButton
                color={audioOn ? "primary" : "default"}
                onClick={toggleAudio}
                disabled={!streamRef.current}
              >
                {audioOn ? <Mic /> : <MicOff />}
              </IconButton>
            </Box>
          </CardContent>
        </Card>

        {/* Whiteboard */}
        <Card sx={{ flexBasis: 420, flexGrow: 1, minWidth: 360 }}>
          <CardHeader
            title="Whiteboard"
            action={
              <IconButton color="error" onClick={clearBoard}>
                <Delete />
              </IconButton>
            }
          />
          <CardContent>
            <canvas
              ref={canvasRef}
              width={800}
              height={320}
              style={{
                width: "100%",
                background: "#111",
                borderRadius: 8,
                cursor: "crosshair",
              }}
            />
            {/* Keyboard → whiteboard */}
            <Box mt={2} display="flex" gap={1}>
              <TextField
                fullWidth
                size="small"
                placeholder={
                  isTutor
                    ? "Type notes or code; press Add to push onto the board."
                    : "Tutor text will appear on the board."
                }
                value={whiteboardText}
                onChange={(e) => setWhiteboardText(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  isTutor &&
                  whiteboardText.trim() &&
                  (e.preventDefault(), addTextToBoard())
                }
                multiline
                maxRows={3}
                disabled={!isTutor}
              />
              <Button
                variant="contained"
                onClick={addTextToBoard}
                disabled={!isTutor || !whiteboardText.trim()}
                sx={{ whiteSpace: "nowrap" }}
              >
                Add
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* BOTTOM: Chat + AI Q&A */}
      <Box display="flex" gap={3} mt={3} flexWrap="wrap">
        {/* Chat */}
        <Card sx={{ flexBasis: 420, flexGrow: 1, minWidth: 360 }}>
          <CardHeader title="Classroom Chat" />
          <CardContent>
            <Paper
              sx={{
                height: 240,
                overflowY: "auto",
                p: 2,
                mb: 2,
                borderRadius: 2,
              }}
            >
              {chatLog.length === 0 ? (
                <Typography variant="body2" color="grey.500">
                  Chat messages will appear here.
                </Typography>
              ) : (
                chatLog.map((m, i) => (
                  <Typography key={i} sx={{ mb: 1 }}>
                    <b>{m.from}:</b> {m.text}
                  </Typography>
                ))
              )}
            </Paper>

            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
              />
              <IconButton color="primary" onClick={sendChat}>
                <Send />
              </IconButton>
            </Box>
          </CardContent>
        </Card>

        {/* AI Q&A */}
        <Card sx={{ flexBasis: 420, flexGrow: 1, minWidth: 360 }}>
          <CardHeader title="Q&A (AI Tutor)" />
          <CardContent>
            <Paper
              sx={{
                height: 240,
                overflowY: "auto",
                p: 2,
                mb: 2,
                borderRadius: 2,
              }}
            >
              {answers.length === 0 ? (
                <Typography variant="body2" color="grey.500">
                  Ask something about Jac or this lesson.
                </Typography>
              ) : (
                answers.map((ans, i) => (
                  <Typography key={i} sx={{ mb: 1 }}>
                    {ans}
                  </Typography>
                ))
              )}
            </Paper>

            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask the AI..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loadingAnswer && askAI()}
              />
              <Button
                variant="contained"
                onClick={askAI}
                disabled={loadingAnswer}
              >
                {loadingAnswer ? <CircularProgress size={18} /> : "Ask"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default VirtualClassroomPage;
