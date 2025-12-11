import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import { runJacCode } from "../api";

interface JacCodeRunnerProps {
  initialCode?: string;
}

const SAMPLE = `# Write Jac code here
walker hello {
    can target root;
    has msg;
    report "Hello from Jac: " + msg;
}

hello(msg="world")`;

const JacCodeRunner: React.FC<JacCodeRunnerProps> = ({ initialCode }) => {
  const [code, setCode] = useState(initialCode || SAMPLE);
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setOutput(null);
    try {
      const result = await runJacCode(code);
      setOutput(result);
    } catch (e: any) {
      setError(e?.message ?? "Failed to run code.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title="Jac Playground"
        subheader="Edit & run Jac code inline. Syntax errors will surface as ERROR: …"
        action={
          <Button
            size="small"
            variant="contained"
            onClick={handleRun}
            disabled={running}
          >
            {running ? <CircularProgress size={18} /> : "Run"}
          </Button>
        }
      />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box
          sx={{
            height: 320,
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Editor
            height="100%"
            defaultLanguage="plaintext"
            path="main.jac"
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "JetBrains Mono, Menlo, monospace",
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
          />
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {output && (
          <Box
            sx={{
              bgcolor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 2,
              p: 1.5,
              minHeight: 80,
            }}
          >
            <Typography variant="caption" color="grey.400" sx={{ mb: 0.5, display: "block" }}>
              Output
            </Typography>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                fontFamily: "JetBrains Mono, Menlo, monospace",
                fontSize: 13,
              }}
            >
              {output}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default JacCodeRunner;

