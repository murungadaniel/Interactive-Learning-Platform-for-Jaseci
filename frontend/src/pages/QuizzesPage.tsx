// src/pages/QuizzesPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  LinearProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Paper,
} from "@mui/material";
import {
  listLessons,
  type LessonSummary,
  generateQuizQuestions,
  evaluateAnswer,
  saveQuizResult,
} from "../api";
import { DEMO_USER_ID } from "../constants";

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

const QuizzesPage: React.FC = () => {
  // Lessons
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  // Selected chapter
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedLessonTitle, setSelectedLessonTitle] = useState<string>("");

  // Quiz
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Load lessons (chapters) once
  useEffect(() => {
    (async () => {
      try {
        const list = await listLessons();
        setLessons(list);
      } catch (e: any) {
        console.error(e);
        setLessonsError(
          e?.message ?? "Failed to load lessons."
        );
      } finally {
        setLoadingLessons(false);
      }
    })();
  }, []);

  const resetQuizState = () => {
    setQuestions([]);
    setQuizError(null);
    setCurrentIndex(0);
    setSelectedOption("");
    setCorrectCount(0);
    setWrongCount(0);
    setFeedback(null);
    setLastCorrect(null);
    setTimeLeft(0);
    setQuizFinished(false);
  };

  const handleSelectLesson = (lesson: LessonSummary) => {
    setSelectedLessonId(lesson.lesson_id);
    setSelectedLessonTitle(lesson.title);
    resetQuizState();
  };

  const handleStartQuiz = async () => {
    if (!selectedLessonId) return;

    setLoadingQuiz(true);
    resetQuizState();

    try {
      const raw = await generateQuizQuestions(selectedLessonId);
      const parsed = parseMCQs(raw);

      if (!parsed.length) {
        setQuizError(
          "The AI could not generate enough questions from this chapter. Try again."
        );
        return;
      }

      setQuestions(parsed);
      setCurrentIndex(0);
      setTimeLeft(SECONDS_PER_QUESTION);
    } catch (e: any) {
      console.error(e);
      setQuizError(e?.message ?? "Failed to start quiz.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Timer per question
  useEffect(() => {
    if (!questions.length) return;
    if (quizFinished) return;
    if (timeLeft <= 0) return;

    const id = window.setTimeout(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => window.clearTimeout(id);
  }, [timeLeft, questions.length, quizFinished]);

  // Auto handle timeout: treat as wrong, move on
  useEffect(() => {
    if (!questions.length) return;
    if (quizFinished) return;
    if (timeLeft > 0) return;
    if (currentIndex >= questions.length) return;
    if (submitting) return;

    void handleSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const currentQuestion = questions[currentIndex];

  const totalAnswered = correctCount + wrongCount;
  const percent =
    totalAnswered > 0
      ? Math.round((correctCount / totalAnswered) * 100)
      : 0;

  const progressPercent =
    questions.length > 0
      ? Math.round(
          ((currentIndex + (quizFinished ? 1 : 0)) / questions.length) * 100
        )
      : 0;

  async function handleSubmit(autoFromTimer = false) {
    if (!currentQuestion) return;
    if (submitting) return;

    setSubmitting(true);

    let isCorrect = false;
    let explanation = "";

    try {
      if (!autoFromTimer && selectedOption) {
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
          selectedOption
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
          parsed.explanation ||
          (isCorrect ? "Correct." : "Incorrect.");
      } else {
        isCorrect = false;
        explanation = "Time is up – no answer selected.";
      }
    } catch (e) {
      console.error(e);

      if (
        !autoFromTimer &&
        selectedOption &&
        currentQuestion.correct
      ) {
        isCorrect = selectedOption === currentQuestion.correct;
        explanation = isCorrect
          ? "Correct."
          : "Incorrect.";
      } else {
        isCorrect = false;
        explanation = "Could not evaluate answer; marking as incorrect.";
      }
    }

    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    const newWrong = isCorrect ? wrongCount : wrongCount + 1;

    setCorrectCount(newCorrect);
    setWrongCount(newWrong);
    setLastCorrect(isCorrect);
    setFeedback(explanation);

    const isLastQuestion = currentIndex >= questions.length - 1;

    if (isLastQuestion) {
      setQuizFinished(true);
      setTimeLeft(0);
      if (selectedLessonId) {
        try {
          await saveQuizResult(
            DEMO_USER_ID,
            selectedLessonId,
            newCorrect,
            newWrong
          );
        } catch (e) {
          console.error("Failed to save quiz result:", e);
        }
      }
    } else {
      setCurrentIndex((idx) => idx + 1);
      setSelectedOption("");
      setTimeLeft(SECONDS_PER_QUESTION);
    }

    setSubmitting(false);
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Smart Quizzes
      </Typography>
      <Typography variant="subtitle1" color="grey.400" gutterBottom>
        Pick a chapter and answer 20 multiple-choice questions generated from its content.
      </Typography>

      <Box mt={2} display="flex" gap={3} flexWrap="wrap">
        {/* LEFT: Lesson list */}
        <Card sx={{ flexBasis: 320, flexGrow: 1, minWidth: 280 }}>
          <CardHeader title="Chapters" subheader="Choose what to practise." />
          <CardContent sx={{ maxHeight: 420, overflowY: "auto" }}>
            {loadingLessons ? (
              <Box display="flex" justifyContent="center" my={3}>
                <CircularProgress size={24} />
              </Box>
            ) : lessonsError ? (
              <Alert severity="error">{lessonsError}</Alert>
            ) : lessons.length === 0 ? (
              <Typography variant="body2" color="grey.500">
                No lessons found.
              </Typography>
            ) : (
              <List dense>
                {lessons.map((l) => {
                  const selected = selectedLessonId === l.lesson_id;
                  return (
                    <ListItem key={l.lesson_id} disablePadding>
                      <ListItemButton
                        selected={selected}
                        onClick={() => handleSelectLesson(l)}
                      >
                        <ListItemText
                          primary={l.title}
                          secondary={l.description}
                          primaryTypographyProps={{
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                          secondaryTypographyProps={{
                            fontSize: 12,
                            color: "grey.500",
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Quiz panel */}
        <Card sx={{ flexBasis: 520, flexGrow: 2, minWidth: 360 }}>
          <CardHeader
            title={
              selectedLessonTitle || "Select a chapter to start a quiz"
            }
            subheader={
              questions.length
                ? `Question ${Math.min(
                    currentIndex + 1,
                    questions.length
                  )} of ${questions.length}`
                : selectedLessonId
                ? "Generate a quiz for this chapter."
                : "Choose a chapter from the left."
            }
            action={
              questions.length > 0 && (
                <Chip
                  label={`Score: ${percent}%`}
                  color={percent >= 70 ? "success" : "default"}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )
            }
          />
          <CardContent>
            {!selectedLessonId && (
              <Typography variant="body2" color="grey.500">
                Select a chapter on the left to begin.
              </Typography>
            )}

            {selectedLessonId &&
              !questions.length &&
              !loadingQuiz &&
              !quizError && (
                <Box>
                  <Typography variant="body2" color="grey.400" mb={2}>
                    Click below to create a 20-question quiz from this chapter.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleStartQuiz}
                    disabled={loadingQuiz}
                  >
                    {loadingQuiz ? (
                      <CircularProgress size={20} />
                    ) : (
                      "Generate Quiz"
                    )}
                  </Button>
                </Box>
              )}

            {quizError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {quizError}
              </Alert>
            )}

            {loadingQuiz && (
              <Box my={3} textAlign="center">
                <CircularProgress size={24} />
              </Box>
            )}

            {questions.length > 0 && currentQuestion && (
              <Box>
                {/* Progress & timer */}
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
                      Answered: {totalAnswered} / {questions.length} | Correct:{" "}
                      {correctCount} | Wrong: {wrongCount}
                    </Typography>
                    <Chip
                      label={`Time: ${timeLeft}s`}
                      size="small"
                      color={timeLeft <= 10 ? "warning" : "default"}
                    />
                  </Box>
                </Box>

                {/* Question */}
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
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
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

                {/* Feedback */}
                {feedback && (
                  <Alert
                    severity={
                      lastCorrect === null
                        ? "info"
                        : lastCorrect
                        ? "success"
                        : "warning"
                    }
                    sx={{ mb: 2 }}
                  >
                    {feedback}
                  </Alert>
                )}

                <Box display="flex" justifyContent="space-between" mt={2}>
                  <Typography
                    variant="body2"
                    color="grey.500"
                    sx={{ alignSelf: "center" }}
                  >
                    Question {currentIndex + 1} of {questions.length}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting || quizFinished}
                  >
                    {submitting
                      ? "Checking…"
                      : currentIndex >= questions.length - 1
                      ? "Submit & Finish"
                      : "Submit"}
                  </Button>
                </Box>

                {quizFinished && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Quiz complete
                    </Typography>
                    <Typography variant="body2" color="grey.300">
                      Final score:{" "}
                      <strong>
                        {percent}% ({correctCount} correct, {wrongCount} wrong)
                      </strong>
                      . Your attempt has been recorded.
                    </Typography>
                    <Button
                      sx={{ mt: 2 }}
                      variant="outlined"
                      onClick={handleStartQuiz}
                    >
                      Retry this chapter
                    </Button>
                  </>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default QuizzesPage;
