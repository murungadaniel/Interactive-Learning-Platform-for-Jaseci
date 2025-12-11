import React, { useState } from "react";
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
} from "@mui/material";
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { aiChat } from "../api";

interface AIAssistantButtonProps {
  chapterTitle?: string;
  chapterContent?: string;
}

function sanitizeAiReply(text: string): string {
  if (!text) return "";

  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
  chapterTitle,
  chapterContent,
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ from: "you" | "ai"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    // Initialize with a welcome message if chat is empty
    if (chat.length === 0) {
      setChat([
        {
          from: "ai",
          text: chapterTitle
            ? `Hi! I'm your AI assistant. I can help you understand "${chapterTitle}". Ask me anything about this chapter!`
            : "Hi! I'm your AI assistant. Ask me anything about this chapter!",
        },
      ]);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setChat((prev) => [...prev, { from: "you", text }]);
    setInput("");
    setLoading(true);

    try {
      // Enhance the prompt with chapter context if available
      let enhancedPrompt = text;
      if (chapterTitle && chapterContent) {
        enhancedPrompt = `Context: This question is about the chapter "${chapterTitle}". Chapter content (for reference): ${chapterContent.slice(0, 2000)}...\n\nQuestion: ${text}`;
      }

      const reply = await aiChat(enhancedPrompt);
      setChat((prev) => [
        ...prev,
        { from: "ai", text: sanitizeAiReply(reply) },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        {
          from: "ai",
          text: "I can't answer right now. Try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Fab
        color="secondary"
        aria-label="AI Assistant"
        onClick={handleOpen}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1300, // Above dialog backdrop (z-index 1300)
        }}
      >
        <ChatIcon />
      </Fab>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            maxHeight: 600,
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">AI Assistant</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Paper
            sx={{
              height: "calc(80vh - 180px)",
              maxHeight: 400,
              overflowY: "auto",
              p: 2,
              mb: 2,
              borderRadius: 2,
              bgcolor: "rgba(0,0,0,0.02)",
            }}
          >
            {chat.map((m, i) => (
              <Box key={i} mb={2}>
                <Typography
                  variant="caption"
                  color={m.from === "you" ? "secondary.main" : "primary.main"}
                  sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
                >
                  {m.from === "you" ? "You" : "AI Assistant"}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {m.text}
                </Typography>
              </Box>
            ))}
            {loading && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={20} />
              </Box>
            )}
          </Paper>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask about this chapter..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              disabled={loading}
            />
            <IconButton
              color="primary"
              onClick={send}
              disabled={loading || !input.trim()}
            >
              {loading ? <CircularProgress size={18} /> : <SendIcon />}
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AIAssistantButton;

