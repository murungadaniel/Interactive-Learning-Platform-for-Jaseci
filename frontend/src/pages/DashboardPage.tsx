// src/pages/DashboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from "@mui/material";

import {
  getUserAttempts,
  listLessons,
  type LessonAttempt,
  type LessonSummary,
} from "../api";
import { DEMO_USER_ID } from "../constants";
import type { Role } from "../types";

interface DashboardPageProps {
  role: Role;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ role }) => {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<LessonAttempt[]>([]);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load attempts + lessons once
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
        setError(e?.message ?? "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Map lesson_id -> title
  const lessonTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    lessons.forEach((l) => {
      map[l.lesson_id] = l.title;
    });
    return map;
  }, [lessons]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!attempts.length) {
      return {
        totalAttempts: 0,
        completedCount: 0,
        inProgressCount: 0,
        completionRate: 0,
      };
    }

    const totalAttempts = attempts.length;
    let completedCount = 0;
    let inProgressCount = 0;

    for (const a of attempts) {
      const status = (a.status || "").toLowerCase();
      if (status === "completed") completedCount++;
      else if (status === "in_progress" || status === "started") {
        inProgressCount++;
      }
    }

    const completionRate =
      totalAttempts > 0 ? Math.round((completedCount / totalAttempts) * 100) : 0;

    return {
      totalAttempts,
      completedCount,
      inProgressCount,
      completionRate,
    };
  }, [attempts]);

  // Recent activity = latest attempts by timestamp
  const recentAttempts = useMemo(() => {
    const sorted = [...attempts].sort((a, b) => {
      const ta = a.timestamp || "";
      const tb = b.timestamp || "";
      return tb.localeCompare(ta);
    });
    return sorted.slice(0, 6);
  }, [attempts]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Welcome back, {role === "Tutor" ? "Tutor" : "Learner"}
      </Typography>
      <Typography variant="subtitle1" color="grey.400" gutterBottom>
        Your overview updates automatically as you work through Jac lessons.
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
          {/* Top stats */}
          <Grid container spacing={3} mt={1}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="Activity" />
                <CardContent>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.totalAttempts}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    Total lesson attempts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="Completed" />
                <CardContent>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.completedCount}
                  </Typography>
                  <Typography variant="body2" color="grey.400" gutterBottom>
                    Lessons marked as completed
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={stats.completionRate}
                    sx={{ mt: 1 }}
                  />
                  <Typography
                    variant="caption"
                    color="grey.500"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {stats.completionRate}% of your attempts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="In progress" />
                <CardContent>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.inProgressCount}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    Lessons started but not completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent Activity */}
          <Grid container spacing={3} mt={3}>
            <Grid item xs={12} md={7}>
              <Card>
                <CardHeader title="Recent activity" />
                <CardContent>
                  {recentAttempts.length === 0 ? (
                    <Typography variant="body2" color="grey.500">
                      No activity yet. Start a Jac lesson to see recent activity
                      here.
                    </Typography>
                  ) : (
                    <List dense>
                      {recentAttempts.map((a, idx) => {
                        const title = lessonTitleMap[a.lesson_id] ?? a.lesson_id;
                        const status = (a.status || "").toLowerCase();
                        const color =
                          status === "completed"
                            ? "success"
                            : status === "in_progress" || status === "started"
                            ? "warning"
                            : "default";

                        return (
                          <ListItem key={idx} sx={{ px: 0 }}>
                            <ListItemText
                              primary={title}
                              secondary={
                                a.timestamp
                                  ? new Date(a.timestamp).toLocaleString()
                                  : undefined
                              }
                            />
                            <Chip
                              label={a.status || "unknown"}
                              size="small"
                              color={
                                color === "default" ? undefined : (color as any)
                              }
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Simple "role" card – purely informational, no static stats */}
            <Grid item xs={12} md={5}>
              <Card>
                <CardHeader title="Role context" />
                <CardContent>
                  <Typography variant="body2" color="grey.400" gutterBottom>
                    You&apos;re currently viewing the app as{" "}
                    <Chip
                      size="small"
                      label={role}
                      color="secondary"
                      sx={{ ml: 0.5 }}
                    />
                    .
                  </Typography>
                  <Typography variant="body2" color="grey.500">
                    Switch to Tutor / Student in the sidebar to change what you
                    see in other pages (session controls, etc.). Analytics and
                    recent activity always reflect this device&apos;s demo user.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default DashboardPage;
