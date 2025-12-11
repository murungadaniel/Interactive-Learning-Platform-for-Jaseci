// src/pages/SubjectsPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Alert,
  CircularProgress,
  Paper,
  Button,
  Chip,
  LinearProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  IconButton,
  Snackbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import {
  listLessons,
  getLessonDetail,
  recordAttempt,
  syncLessonsFromGithub,
  getUserAttempts,
  generateQuizQuestions,
  evaluateAnswer,
  saveQuizResult,
  type LessonSummary,
  type LessonDetail,
  type LessonAttempt,
} from "../api";
import CodeBlockEditor from "../components/CodeBlockEditor";
import JacCodeRunner from "../components/JacCodeRunner";
import AIAssistantButton from "../components/AIAssistantButton";
import type { AuthUser } from "../api";

// =======================================================
// TEXT NORMALIZATION & PARSING
// =======================================================

// Normalize raw lesson content – fix <div class="code-block">,
// remove stray HTML and normalize line breaks.
function normalizeLessonText(content: string): string {
  let text = content;

  // Convert <div class="code-block">...</div> into fenced blocks
  text = text.replace(
    /<div\s+class=["']code-block["']\s*>([\s\S]*?)<\/div>/gi,
    (match, inner) => {
      const cleanedInner = String(inner)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/\r\n/g, "\n")
        .trim();

      // If there are already ``` fences inside, just unwrap
      if (cleanedInner.includes("```")) {
        return "\n" + cleanedInner + "\n";
      }

      return `\n\`\`\`jac\n${cleanedInner}\n\`\`\`\n`;
    }
  );

  // Turn leftover <br> into real newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Remove any other <div> tags
  text = text.replace(/<\/?div[^>]*>/gi, "");

  // Normalize line endings and NBSP
  text = text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""))
    .join("\n");

  return text;
}

// Split content into TEXT vs CODE blocks using ``` fences
function parseLessonContent(
  content: string
): { type: "text" | "code"; value: string; language?: string }[] {
  const blocks: { type: "text" | "code"; value: string; language?: string }[] =
    [];
  const fenceRegex = /```(\w+)?\n([\s\S]*?)```/g;

  const normalized = normalizeLessonText(content);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(normalized)) !== null) {
    const [full, lang, codeBody] = match;
    const start = match.index;

    // Text before this code block
    if (start > lastIndex) {
      const textChunk = normalized.slice(lastIndex, start).trim();
      if (textChunk) {
        blocks.push({ type: "text", value: textChunk });
      }
    }

    blocks.push({
      type: "code",
      value: codeBody.trimEnd(),
      language: lang || "code",
    });

    lastIndex = start + full.length;
  }

  // Any remaining text after the last code block
  if (lastIndex < normalized.length) {
    const remaining = normalized.slice(lastIndex).trim();
    if (remaining) {
      blocks.push({ type: "text", value: remaining });
    }
  }

  if (blocks.length === 0 && normalized.trim()) {
    blocks.push({ type: "text", value: normalized.trim() });
  }

  return blocks;
}

// Inline markdown → simple HTML (bold, italic, code) and cleanup
function formatInlineToHtml(raw: string): string {
  // normalize spaces and strip stray <br>
  let text = raw.replace(/<br\s*\/?>/gi, " ");

  // escape HTML
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // italics *text* or _text_
  html = html.replace(/(\s|^)\*(.+?)\*(\s|$)/g, "$1<em>$2</em>$3");
  html = html.replace(/(\s|^)\_(.+?)\_(\s|$)/g, "$1<em>$2</em>$3");

  // inline code `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // double hyphens → en dash
  html = html.replace(/--+/g, "–");

  // strip any leftover markdown markers
  html = html.replace(/\*\*/g, "");
  html = html.replace(/`+/g, "");
  html = html.replace(/^#+\s*/gm, "");

  return html;
}

// Render a text block with paragraphs, headings, lists, tables, and clean section markers
function renderTextBlock(text: string, blockIndex: number) {
  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let i = 0;

  const flushParagraph = (buffer: string[]) => {
    if (!buffer.length) return;
    const joined = buffer.join(" ").trim();
    if (!joined) return;
    elements.push(
      <Typography
        key={`p_${blockIndex}_${elements.length}`}
        paragraph
        sx={{ fontSize: 15, lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{ __html: formatInlineToHtml(joined) }}
      />
    );
    buffer.length = 0;
  };

  let paragraphBuffer: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      flushParagraph(paragraphBuffer);
      i++;
      continue;
    }

    // horizontal rules like --- or ***
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph(paragraphBuffer);
      i++;
      continue;
    }

    // Section markers like === "Jac", === "Jac Configuration"
    const sectionMatch = line.match(/^\s*={3,}\s*"?(.+?)"?\s*={0,}\s*$/);
    if (sectionMatch) {
      flushParagraph(paragraphBuffer);
      const sectionTitle = sectionMatch[1].trim();

      if (sectionTitle) {
        elements.push(
          <Typography
            key={`sec_${blockIndex}_${elements.length}`}
            variant="h5"
            sx={{ mt: 3, mb: 1.5, fontWeight: 700 }}
          >
            {sectionTitle}
          </Typography>
        );
      }

      i++;
      continue;
    }

    // Headings: #, ##, ###
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph(paragraphBuffer);
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const variant =
        level === 1 ? "h4" : level === 2 ? "h5" : "h6";

      elements.push(
        <Typography
          key={`h_${blockIndex}_${elements.length}`}
          variant={variant as any}
          sx={{ mt: 2, mb: 1, fontWeight: 700 }}
          dangerouslySetInnerHTML={{ __html: formatInlineToHtml(text) }}
        />
      );
      i++;
      continue;
    }

    // Tables: lines starting with |
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushParagraph(paragraphBuffer);
      const tableLines: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length) {
        const rows = tableLines.map((ln) =>
          ln
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((c) => c.trim())
        );

        // drop separator row (---)
        const filteredRows = rows.filter(
          (r) => !r.every((cell) => /^-+$/.test(cell))
        );

        elements.push(
          <Box
            key={`tbl_${blockIndex}_${elements.length}`}
            sx={{
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 2,
              overflow: "hidden",
              mb: 2,
            }}
          >
            {filteredRows.map((cells, rowIdx) => (
              <Box
                key={rowIdx}
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`,
                  bgcolor:
                    rowIdx === 0
                      ? "rgba(142,92,255,0.25)"
                      : "transparent",
                  borderBottom:
                    rowIdx === filteredRows.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {cells.map((cell, ci) => (
                  <Box
                    key={ci}
                    sx={{ px: 1.5, py: 1, fontSize: 14 }}
                    dangerouslySetInnerHTML={{
                      __html: formatInlineToHtml(cell),
                    }}
                  />
                ))}
              </Box>
            ))}
          </Box>
        );
      }
      continue;
    }

    // Bullet list: -, *, +
    if (/^\s*[-*+]\s+/.test(line)) {
      flushParagraph(paragraphBuffer);
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, "").trim());
        i++;
      }
      elements.push(
        <Box
          key={`ul_${blockIndex}_${elements.length}`}
          component="ul"
          sx={{ pl: 3, mb: 1.5, mt: 0.5 }}
        >
          {items.map((txt, idx) => (
            <Box
              key={idx}
              component="li"
              sx={{ mb: 0.5, fontSize: 15 }}
              dangerouslySetInnerHTML={{
                __html: formatInlineToHtml(txt),
              }}
            />
          ))}
        </Box>
      );
      continue;
    }

    // Numbered list: 1. 2. 3.
    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph(paragraphBuffer);
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i++;
      }
      elements.push(
        <Box
          key={`ol_${blockIndex}_${elements.length}`}
          component="ol"
          sx={{ pl: 3, mb: 1.5, mt: 0.5 }}
        >
          {items.map((txt, idx) => (
            <Box
              key={idx}
              component="li"
              sx={{ mb: 0.5, fontSize: 15 }}
              dangerouslySetInnerHTML={{
                __html: formatInlineToHtml(txt),
              }}
            />
          ))}
        </Box>
      );
      continue;
    }

    // Default: part of a paragraph
    paragraphBuffer.push(line);
    i++;
  }

  flushParagraph(paragraphBuffer);
  return elements;
}

// =======================================================
// QUIZ HELPERS (MCQ parsing + timers)
// =======================================================

type MCQ = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct?: string;
};

const QUESTIONS_PER_QUIZ = 20;
const SECONDS_PER_QUESTION = 40;

function parseMCQs(raw: string): MCQ[] {
  const blocks = raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const mcqs: MCQ[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) continue;

    const questionLine =
      lines.find((l) => /^\d+[\).]/.test(l)) ?? lines[0];

    const question = questionLine.replace(/^\d+[\).]\s*/, "").trim();

    const getOpt = (key: "A" | "B" | "C" | "D") => {
      const regex = new RegExp(`^${key}[\\)\\.\\:]\\s*(.*)`);
      const match = lines.find((l) => regex.test(l));
      if (!match) return "";
      return match.replace(regex, "$1").trim();
    };

    const A = getOpt("A");
    const B = getOpt("B");
    const C = getOpt("C");
    const D = getOpt("D");

    const correctLine = lines.find((l) =>
      /^Correct\s*[:\-]/i.test(l)
    );
    const correctMatch = correctLine?.match(/([ABCD])/i);
    const correct = correctMatch?.[1]?.toUpperCase() as
      | "A"
      | "B"
      | "C"
      | "D"
      | undefined;

    if (!question || !A || !B || !C || !D) continue;

    mcqs.push({
      question,
      options: { A, B, C, D },
      correct,
    });
  }

  return mcqs.slice(0, QUESTIONS_PER_QUIZ);
}

// =======================================================
// SUBJECTS PAGE
// =======================================================

interface SubjectsPageProps {
  authUser: AuthUser | null;
}

const SubjectsPage: React.FC<SubjectsPageProps> = ({ authUser }) => {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(
    null
  );
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<LessonAttempt[]>([]);

  const [progressByLesson, setProgressByLesson] = useState<
    Record<
      string,
      {
        status: "locked" | "available" | "completed";
        score: number;
      }
    >
  >({});

  // Quiz state – scoped to the currently open lesson
  const [quizQuestions, setQuizQuestions] = useState<MCQ[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState("");
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizWrong, setQuizWrong] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizLastCorrect, setQuizLastCorrect] = useState<boolean | null>(null);
  const [quizTimeLeft, setQuizTimeLeft] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const resetQuizState = () => {
    setQuizQuestions([]);
    setQuizError(null);
    setQuizCurrentIndex(0);
    setQuizSelectedOption("");
    setQuizCorrect(0);
    setQuizWrong(0);
    setQuizFeedback(null);
    setQuizLastCorrect(null);
    setQuizTimeLeft(0);
    setQuizFinished(false);
  };

  // Load lesson summaries + user attempts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setError(null);

        // sync from GitHub (safe to ignore errors)
        try {
          await syncLessonsFromGithub();
        } catch (e) {
          console.warn("syncLessonsFromGithub failed (ignored)", e);
        }

        const [data, attemptData] = await Promise.all([
          listLessons(),
          authUser ? getUserAttempts(authUser.username) : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setLessons(data);
          setAttempts(attemptData);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to fetch lessons.");
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  // Derive gating status per lesson
  useEffect(() => {
    const bestScores: Record<string, number> = {};
    attempts.forEach((a) => {
      const score =
        typeof a.score === "number" ? a.score : Number(a.score ?? 0);
      const prev = bestScores[a.lesson_id] ?? 0;
      bestScores[a.lesson_id] = Math.max(prev, score);
    });

    const map: Record<
      string,
      { status: "locked" | "available" | "completed"; score: number }
    > = {};

    lessons.forEach((l, idx) => {
      const prevId = idx > 0 ? lessons[idx - 1].lesson_id : null;
      const prevPassed =
        idx === 0 ? true : (bestScores[prevId ?? ""] ?? 0) >= 0.5;
      const bestScore = bestScores[l.lesson_id] ?? 0;
      const completed = bestScore >= 0.5;
      const locked = !prevPassed;

      map[l.lesson_id] = {
        status: locked ? "locked" : completed ? "completed" : "available",
        score: Math.round(bestScore * 10000) / 10000,
      };
    });

    setProgressByLesson(map);
  }, [lessons, attempts]);

  const openLesson = async (id: string) => {
    const progress = progressByLesson[id];
    if (authUser && progress?.status === "locked") {
      setSnackbarMsg(
        "Unlock this chapter by scoring at least 50% on the previous quiz."
      );
      return;
    }

    setLoadingLesson(true);
    setSelectedLesson(null);
    resetQuizState();
    try {
      const detail = await getLessonDetail(id);
      setSelectedLesson(detail);
      setLessonDialogOpen(true);

      // Mark as started to track reading
      if (authUser) {
        await recordAttempt({
          user_id: authUser.username,
          lesson_id: detail.lesson_id,
          status: "in_progress",
          score: 0,
        });

        // optimistic local update so "In progress" surfaces without a refresh
        setAttempts((prev) => [
          ...prev,
          {
            lesson_id: detail.lesson_id,
            status: "in_progress",
            score: 0,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
      setError("Could not load lesson.");
    } finally {
      setLoadingLesson(false);
    }
  };

  const closeLesson = () => {
    setLessonDialogOpen(false);
    resetQuizState();
  };

  const currentQuestion = quizQuestions[quizCurrentIndex];
  const totalAnswered = quizCorrect + quizWrong;
  const quizPercent =
    totalAnswered > 0
      ? Math.round((quizCorrect / totalAnswered) * 100)
      : 0;
  const progressPercent =
    quizQuestions.length > 0
      ? Math.round(
          ((quizCurrentIndex + (quizFinished ? 1 : 0)) /
            quizQuestions.length) *
            100
        )
      : 0;

  const handleStartQuiz = async () => {
    if (!selectedLesson) return;

    setQuizLoading(true);
    resetQuizState();

    try {
      const raw = await generateQuizQuestions(selectedLesson.lesson_id);
      const parsed = parseMCQs(raw);
      if (!parsed.length) {
        setQuizError(
          "The AI could not generate enough questions from this chapter. Try again."
        );
        return;
      }
      setQuizQuestions(parsed);
      setQuizCurrentIndex(0);
      setQuizTimeLeft(SECONDS_PER_QUESTION);
    } catch (e: any) {
      console.error(e);
      setQuizError(e?.message ?? "Failed to start quiz.");
    } finally {
      setQuizLoading(false);
    }
  };

  // Per-question timer
  useEffect(() => {
    if (!quizQuestions.length || quizFinished || quizTimeLeft <= 0) return;
    const id = window.setTimeout(() => {
      setQuizTimeLeft((t) => t - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [quizQuestions.length, quizFinished, quizTimeLeft]);

  // Auto submit on timeout
  useEffect(() => {
    if (!quizQuestions.length) return;
    if (quizFinished) return;
    if (quizTimeLeft > 0) return;
    if (!currentQuestion) return;
    if (quizSubmitting) return;
    void handleSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizTimeLeft]);

  async function finishQuiz(newCorrect: number, newWrong: number) {
    const total = newCorrect + newWrong;
    const scoreRatio = total > 0 ? newCorrect / total : 0;
    const percent = Math.round(scoreRatio * 100);

    setQuizFinished(true);
    setQuizTimeLeft(0);

    if (selectedLesson && authUser) {
      try {
        await saveQuizResult(
          authUser.username,
          selectedLesson.lesson_id,
          newCorrect,
          newWrong
        );

        // optimistic update so gating refreshes without reloading
        setAttempts((prev) => [
          ...prev,
          {
            lesson_id: selectedLesson.lesson_id,
            status: percent >= 50 ? "completed" : "quiz_completed",
            score: scoreRatio,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        console.error("Failed to save quiz result:", e);
      }
    }

    setSnackbarMsg(
      percent >= 50
        ? "Quiz passed! Next chapter unlocked."
        : "Score below 50%. Retry to unlock the next chapter."
    );
  }

  async function handleSubmit(autoFromTimer = false) {
    if (!currentQuestion) return;
    if (quizSubmitting) return;

    setQuizSubmitting(true);

    let isCorrect = false;
    let explanation = "";

    try {
      if (!autoFromTimer && quizSelectedOption) {
        const questionForEval =
          currentQuestion.question +
          "\nA) " +
          currentQuestion.options.A +
          "\nB) " +
          currentQuestion.options.B +
          "\nC) " +
          currentQuestion.options.C +
          "\nD) " +
          currentQuestion.options.D;

        const evalRaw = await evaluateAnswer(
          questionForEval,
          quizSelectedOption
        );

        let parsed: { correct?: boolean; explanation?: string } = {};
        try {
          parsed =
            typeof evalRaw === "string" ? JSON.parse(evalRaw) : evalRaw;
        } catch {
          parsed = {};
        }

        isCorrect = !!parsed.correct;
        explanation =
          parsed.explanation || (isCorrect ? "Correct." : "Incorrect.");
      } else {
        isCorrect = false;
        explanation = "Time is up – no answer selected.";
      }
    } catch (e) {
      console.error(e);

      if (!autoFromTimer && quizSelectedOption && currentQuestion.correct) {
        isCorrect = quizSelectedOption === currentQuestion.correct;
        explanation = isCorrect ? "Correct." : "Incorrect.";
      } else {
        isCorrect = false;
        explanation = "Could not evaluate answer; marking as incorrect.";
      }
    }

    const newCorrect = isCorrect ? quizCorrect + 1 : quizCorrect;
    const newWrong = isCorrect ? quizWrong : quizWrong + 1;

    setQuizCorrect(newCorrect);
    setQuizWrong(newWrong);
    setQuizLastCorrect(isCorrect);
    setQuizFeedback(explanation);

    const isLastQuestion = quizCurrentIndex >= quizQuestions.length - 1;

    if (isLastQuestion) {
      await finishQuiz(newCorrect, newWrong);
    } else {
      setQuizCurrentIndex((idx) => idx + 1);
      setQuizSelectedOption("");
      setQuizTimeLeft(SECONDS_PER_QUESTION);
    }

    setQuizSubmitting(false);
  }

  const currentLessonProgress = selectedLesson
    ? progressByLesson[selectedLesson.lesson_id]
    : undefined;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Jac Book
      </Typography>
      <Typography variant="subtitle1" color="grey.400" gutterBottom>
        Browse Jac chapters. Logged-in students can take quizzes and track
        progress; guests can freely read without restrictions.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} mt={1}>
        {/* LESSON LIST */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Chapters"
              subheader={
                loadingList ? "Syncing from GitHub..." : `Total: ${lessons.length}`
              }
              action={
                loadingLesson && <CircularProgress size={20} color="secondary" />
              }
            />
            <CardContent sx={{ maxHeight: 500, overflowY: "auto", pr: 1 }}>
              {loadingList ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    py: 4,
                  }}
                >
                  <CircularProgress size={24} />
                </Box>
              ) : lessons.length === 0 ? (
                <Typography color="grey.500">
                  No lessons found. Make sure the backend has synced from GitHub.
                </Typography>
              ) : (
                lessons.map((l, idx) => {
                  const progress = progressByLesson[l.lesson_id];
                  const locked = authUser ? progress?.status === "locked" : false;
                  const completed = authUser ? progress?.status === "completed" : false;
                  const scoreLabel =
                    authUser && progress && progress.score > 0
                      ? `${Math.round(progress.score * 100)}%`
                      : authUser
                      ? "Not started"
                      : "Guest";

                  return (
                    <Paper
                      key={l.lesson_id}
                      sx={{
                        p: 1.3,
                        mb: 1,
                        cursor: locked ? "not-allowed" : "pointer",
                        borderRadius: 2,
                        opacity: locked ? 0.6 : 1,
                        borderColor: completed
                          ? "success.main"
                          : "rgba(255,255,255,0.12)",
                        "&:hover": {
                          borderColor: locked
                            ? "rgba(255,255,255,0.12)"
                            : "secondary.main",
                          bgcolor: locked
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(63,224,197,0.06)",
                        },
                      }}
                      variant="outlined"
                      onClick={() => openLesson(l.lesson_id)}
                    >
                      <Box display="flex" justifyContent="space-between" gap={1}>
                        <Box>
                          <Typography fontWeight={600}>{l.title}</Typography>
                          <Typography variant="body2" color="grey.400">
                            {l.description}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          color={
                            locked
                              ? "default"
                              : completed
                              ? "success"
                              : "warning"
                          }
                          label={
                            locked
                              ? "Locked"
                              : completed
                              ? `Passed ${scoreLabel}`
                              : `Score ${scoreLabel}`
                          }
                          sx={{ alignSelf: "start", minWidth: 100 }}
                        />
                      </Box>
                      {authUser && idx > 0 && locked && (
                        <Typography
                          variant="caption"
                          color="grey.500"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          Complete the previous quiz with 50%+ to unlock.
                        </Typography>
                      )}
                    </Paper>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right side hint */}
        <Grid item xs={12} md={8}>
          {!selectedLesson && (
            <Typography color="grey.500" sx={{ mt: 2 }}>
              Select a chapter on the left to read it and attempt its quiz on the
              same page.
            </Typography>
          )}
        </Grid>
      </Grid>

      {/* FULL-PAGE LESSON READER + QUIZ */}
      <Dialog fullScreen open={lessonDialogOpen} onClose={closeLesson}>
        <AppBar
          sx={{
            position: "relative",
            background:
              "linear-gradient(90deg, rgba(14,20,35,0.98), rgba(20,30,55,0.98))",
          }}
        >
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={closeLesson}>
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              {selectedLesson?.title ?? "Lesson"}
            </Typography>
            {authUser && selectedLesson && (
              <Chip
                label={
                  currentLessonProgress?.status === "completed"
                    ? `Passed ${Math.round((currentLessonProgress?.score ?? 0) * 100)}%`
                    : currentLessonProgress?.status === "locked"
                    ? "Locked"
                    : "In progress"
                }
                color={
                  currentLessonProgress?.status === "completed"
                    ? "success"
                    : currentLessonProgress?.status === "locked"
                    ? "default"
                    : "warning"
                }
              />
            )}
          </Toolbar>
        </AppBar>

        <DialogContent
          sx={{
            bgcolor: "background.default",
            p: { xs: 2, md: 4 },
          }}
        >
          {!selectedLesson ? (
            <Typography color="grey.500">Loading lesson content…</Typography>
          ) : (
            <>
              {authUser ? (
                <Grid container spacing={3} sx={{ maxWidth: 1300, mx: "auto" }}>
                  <Grid
                    item
                    xs={12}
                    md={7}
                    sx={{
                      maxHeight: { md: "calc(100vh - 200px)" },
                      overflowY: { md: "auto" },
                      pr: { md: 2 },
                    }}
                  >
                    {selectedLesson.description && (
                      <Typography
                        variant="subtitle1"
                        color="grey.300"
                        sx={{ mb: 2 }}
                      >
                        {selectedLesson.description}
                      </Typography>
                    )}

                    {parseLessonContent(selectedLesson.content).map((block, idx) =>
                      block.type === "text" ? (
                        <React.Fragment key={idx}>
                          {renderTextBlock(block.value, idx)}
                        </React.Fragment>
                      ) : (
                        <CodeBlockEditor
                          key={idx}
                          code={block.value}
                          language={block.language}
                        />
                      )
                    )}

                    <Divider sx={{ my: 3 }} />

                    <Box>
                      <Typography variant="h5" fontWeight={700} gutterBottom>
                        Quiz: Check your understanding
                      </Typography>
                      <Typography variant="body2" color="grey.400" gutterBottom>
                        Answer 20 MCQs generated from this chapter. Score at least
                        50% to unlock the next chapter.
                      </Typography>

                      {!quizQuestions.length && !quizLoading && !quizError && (
                        <Button
                          variant="contained"
                          onClick={handleStartQuiz}
                          disabled={quizLoading}
                          sx={{ mt: 1 }}
                        >
                          {quizLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            "Start quiz"
                          )}
                        </Button>
                      )}

                      {quizError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          {quizError}
                        </Alert>
                      )}

                      {quizLoading && (
                        <Box my={3} textAlign="center">
                          <CircularProgress size={24} />
                        </Box>
                      )}

                      {quizQuestions.length > 0 && currentQuestion && (
                        <Box sx={{ mt: 2 }}>
                          <Box mb={2}>
                            <LinearProgress
                              variant="determinate"
                              value={progressPercent}
                              sx={{ mb: 1.5 }}
                            />
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Typography variant="caption" color="grey.400">
                                Answered: {totalAnswered} / {quizQuestions.length} |
                                Correct: {quizCorrect} | Wrong: {quizWrong}
                              </Typography>
                              <Chip
                                label={`Time: ${quizTimeLeft}s`}
                                size="small"
                                color={quizTimeLeft <= 10 ? "warning" : "default"}
                              />
                            </Box>
                          </Box>

                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              mb: 2,
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="subtitle1" fontWeight={600} mb={1}>
                              {currentQuestion.question}
                            </Typography>

                            <RadioGroup
                              value={quizSelectedOption}
                              onChange={(e) => setQuizSelectedOption(e.target.value)}
                            >
                              {(["A", "B", "C", "D"] as const).map((key) => (
                                <FormControlLabel
                                  key={key}
                                  value={key}
                                  control={<Radio />}
                                  label={`${key}) ${
                                    currentQuestion.options[key] || ""
                                  }`}
                                />
                              ))}
                            </RadioGroup>
                          </Paper>

                          {quizFeedback && (
                            <Alert
                              severity={
                                quizLastCorrect === null
                                  ? "info"
                                  : quizLastCorrect
                                  ? "success"
                                  : "warning"
                              }
                              sx={{ mb: 2 }}
                            >
                              {quizFeedback}
                            </Alert>
                          )}

                          <Box display="flex" justifyContent="space-between" mt={2}>
                            <Typography
                              variant="body2"
                              color="grey.500"
                              sx={{ alignSelf: "center" }}
                            >
                              Question {quizCurrentIndex + 1} of{" "}
                              {quizQuestions.length}
                            </Typography>
                            <Button
                              variant="contained"
                              onClick={() => handleSubmit(false)}
                              disabled={quizSubmitting || quizFinished}
                            >
                              {quizSubmitting
                                ? "Checking…"
                                : quizCurrentIndex >= quizQuestions.length - 1
                                ? "Submit & Finish"
                                : "Submit"}
                            </Button>
                          </Box>

                          {quizFinished && (
                            <>
                              <Divider sx={{ my: 2 }} />
                              <Alert
                                severity={quizPercent >= 50 ? "success" : "warning"}
                                sx={{ mb: 2 }}
                              >
                                Final score: {quizPercent}% ({quizCorrect} correct,{" "}
                                {quizWrong} wrong).{" "}
                                {quizPercent >= 50
                                  ? "Great job! You can proceed to the next chapter."
                                  : "You need at least 50% to unlock the next chapter."}
                              </Alert>
                              <Button
                                sx={{ mt: 1 }}
                                variant="outlined"
                                onClick={handleStartQuiz}
                              >
                                Retry this chapter
                              </Button>
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    md={5}
                    sx={{
                      position: { md: "sticky" },
                      top: { md: 88 },
                      alignSelf: "flex-start",
                      pl: { md: 1 },
                    }}
                  >
                    <JacCodeRunner />
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ maxWidth: 960, mx: "auto" }}>
                  {selectedLesson.description && (
                    <Typography
                      variant="subtitle1"
                      color="grey.300"
                      sx={{ mb: 2 }}
                    >
                      {selectedLesson.description}
                    </Typography>
                  )}

                  {parseLessonContent(selectedLesson.content).map((block, idx) =>
                    block.type === "text" ? (
                      <React.Fragment key={idx}>
                        {renderTextBlock(block.value, idx)}
                      </React.Fragment>
                    ) : (
                      <CodeBlockEditor
                        key={idx}
                        code={block.value}
                        language={block.language}
                      />
                    )
                  )}
                </Box>
              )}
              
              {/* AI Assistant Button - shown for all users */}
              {selectedLesson && (
                <AIAssistantButton
                  chapterTitle={selectedLesson.title}
                  chapterContent={selectedLesson.content}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={3500}
        onClose={() => setSnackbarMsg(null)}
      >
        <Alert
          severity="info"
          sx={{ width: "100%" }}
          onClose={() => setSnackbarMsg(null)}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SubjectsPage;
