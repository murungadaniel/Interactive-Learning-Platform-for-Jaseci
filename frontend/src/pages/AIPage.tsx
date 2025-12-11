import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
} from "@mui/material";
import { Send } from "@mui/icons-material";
import { aiChat } from "../api";

function sanitizeAiReply(text: string): string {
  if (!text) return "";

  return text
    // remove markdown bold/italic/backticks
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    // remove markdown headings / list markers at line start
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    // collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    // collapse extra spaces
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}


const AIPage: React.FC = () => {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ from: "you" | "ai"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setChat((prev) => [...prev, { from: "you", text }]);
    setInput("");
    setLoading(true);

    try {
      const reply = await aiChat(text);
      setChat((prev) => [...prev, { from: "ai", text: sanitizeAiReply(reply) }]);
        } catch {
      setChat((prev) => [
        ...prev,
        { from: "ai", text: "I can't answer right now. Try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        AI Assistant
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardHeader title="Chat" />
        <CardContent>
          <Paper
            sx={{
              height: 420,
              overflowY: "auto",
              p: 2,
              mb: 2,
              borderRadius: 2,
            }}
          >
            {chat.length === 0 ? (
              <Typography variant="body2" color="grey.500">
                Start a conversation.
              </Typography>
            ) : (
              chat.map((m, i) => (
                <Box key={i} mb={1.5}>
                  <Typography
                    variant="caption"
                    color={m.from === "you" ? "secondary.main" : "primary.main"}
                    sx={{ fontWeight: 600 }}
                  >
                    {m.from === "you" ? "You" : "AI"}
                  </Typography>
                  <Typography variant="body2">{m.text}</Typography>
                </Box>
              ))
            )}
          </Paper>

          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask anything about Jac or code..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <IconButton color="primary" onClick={send} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : <Send />}
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AIPage;
