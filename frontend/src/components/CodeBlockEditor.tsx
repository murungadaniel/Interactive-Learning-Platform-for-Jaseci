// src/components/CodeBlockEditor.tsx
import React, { useState } from "react";
import { Box, Typography, TextField } from "@mui/material";

interface CodeBlockEditorProps {
  code: string;
  language?: string | null;
}

const CodeBlockEditor: React.FC<CodeBlockEditorProps> = ({ code, language }) => {
  const [value, setValue] = useState(code);

  return (
    <Box sx={{ mb: 2 }}>
      {language && (
        <Typography
          variant="caption"
          color="secondary.main"
          sx={{ display: "block", mb: 0.5 }}
        >
          {language}
        </Typography>
      )}
      <TextField
        multiline
        fullWidth
        size="small"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        InputProps={{
          sx: {
            fontFamily: "JetBrains Mono, Menlo, monospace",
            fontSize: 13,
            bgcolor: "rgba(0,0,0,0.7)",
            borderRadius: 2,
          },
        }}
      />
    </Box>
  );
};

export default CodeBlockEditor;
