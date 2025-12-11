// src/pages/AnalyticsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";

import {
  getUserAttempts,
  listLessons,
  type LessonAttempt,
  type LessonSummary,
} from "../api";
import { DEMO_USER_ID } from "../constants";

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<LessonAttempt[]>([]);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [attemptData, lessonData] = await Promise.all([
          getUserAttempts(DEMO_USER_ID),
          listLessons(),
        ]);
        if (cancelled) return;
        setAttempts(attemptData);
        setLessons(lessonData);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? "Failed to load analytics data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const lessonTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    lessons.forEach((l) => {
      map[l.lesson_id] = l.title;
    });
    return map;
  }, [lessons]);

  const stats = useMemo(() => {
    if (!attempts.length) {
      return {
        totalAttempts: 0,
        completedCount: 0,
        inProgressCount: 0,
        completionRate: 0,
        avgScore: 0,
        lastActivity: null as string | null,
      };
    }

    const totalAttempts = attempts.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let lastActivity: string | null = null;

    for (const a of attempts) {
      const status = (a.status || "").toLowerCase();
      if (status === "completed") completedCount++;
      else if (status === "in_progress" || status === "started") {
        inProgressCount++;
      }

      if (typeof a.score === "number" && !Number.isNaN(a.score)) {
        scoreSum += a.score;
        scoreCount++;
      }

      if (a.timestamp) {
        if (!lastActivity || a.timestamp > lastActivity) {
          lastActivity = a.timestamp;
        }
      }
    }

    const completionRate =
      totalAttempts > 0 ? Math.round((completedCount / totalAttempts) * 100) : 0;
    const avgScore =
      scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : 0;

    return {
      totalAttempts,
      completedCount,
      inProgressCount,
      completionRate,
      avgScore,
      lastActivity,
    };
  }, [attempts]);

  const perLesson = useMemo(() => {
    const byLesson: Record<
      string,
      {
        attempts: number;
        lastStatus: string;
        lastScore: number | null;
        lastTimestamp: string | null;
      }
    > = {};

    for (const a of attempts) {
      const id = a.lesson_id;
      if (!byLesson[id]) {
        byLesson[id] = {
          attempts: 0,
          lastStatus: a.status,
          lastScore: typeof a.score === "number" ? a.score : null,
          lastTimestamp: a.timestamp || null,
        };
      }

      const entry = byLesson[id];
      entry.attempts += 1;

      if (!entry.lastTimestamp || (a.timestamp && a.timestamp > entry.lastTimestamp)) {
        entry.lastStatus = a.status;
        entry.lastScore = typeof a.score === "number" ? a.score : null;
        entry.lastTimestamp = a.timestamp || null;
      }
    }

    return byLesson;
  }, [attempts]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Analytics
      </Typography>
      <Typography variant="subtitle1" color="grey.400" gutterBottom>
        All numbers here are computed live from your lesson attempts.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            mt: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary cards */}
          <Grid container spacing={3} mt={1}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardHeader title="Total attempts" />
                <CardContent>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.totalAttempts}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    Recorded lesson attempts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardHeader title="Completed" />
                <CardContent>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.completedCount}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    Lessons completed
                  </Typography>
                  <Box mt={1.5}>
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      Completion rate
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.completionRate}
                    />
                    <Typography variant="caption" color="grey.400">
                      {stats.completionRate}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardHeader title="In progress" />
                <CardContent>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.inProgressCount}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    Started but not completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardHeader title="Average score" />
                <CardContent>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.avgScore.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    Across all attempts (0–1 scale)
                  </Typography>
                  {stats.lastActivity && (
                    <Typography
                      variant="caption"
                      color="grey.500"
                      sx={{ display: "block", mt: 1 }}
                    >
                      Last activity:{" "}
                      {new Date(stats.lastActivity).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Per-lesson breakdown */}
          <Box mt={4}>
            <Card>
              <CardHeader
                title="Per-lesson progress"
                subheader="Derived from your actual attempts. No hardcoded rows."
              />
              <CardContent>
                {attempts.length === 0 ? (
                  <Typography variant="body2" color="grey.500">
                    No attempts yet. Once you start working on lessons, your
                    per-lesson analytics will appear here.
                  </Typography>
                ) : (
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Lesson</TableCell>
                          <TableCell align="right">Attempts</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Last score</TableCell>
                          <TableCell>Last activity</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(perLesson).map(
                          ([lessonId, info]) => {
                            const title =
                              lessonTitleMap[lessonId] ?? lessonId;
                            const status = (info.lastStatus || "").toLowerCase();
                            const color =
                              status === "completed"
                                ? "success"
                                : status === "in_progress" ||
                                  status === "started"
                                ? "warning"
                                : "default";

                            return (
                              <TableRow key={lessonId}>
                                <TableCell>
                                  <Tooltip title={lessonId}>
                                    <span>{title}</span>
                                  </Tooltip>
                                </TableCell>
                                <TableCell align="right">
                                  {info.attempts}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={
                                      info.lastStatus || "unknown"
                                    }
                                    size="small"
                                    color={
                                      color === "default"
                                        ? undefined
                                        : (color as any)
                                    }
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  {info.lastScore == null
                                    ? "—"
                                    : info.lastScore.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {info.lastTimestamp
                                    ? new Date(
                                        info.lastTimestamp
                                      ).toLocaleString()
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            );
                          }
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Box>
  );
};

export default AnalyticsPage;
