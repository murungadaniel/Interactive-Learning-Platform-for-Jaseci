// src/pages/SchedulePage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Paper,
} from "@mui/material";

type Session = {
  id: string;
  title: string;
  tutor: string;
  dateTime: string; // ISO string or plain text
  mode: "Online" | "Physical";
  notes?: string;
};

const SchedulePage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState<Session>({
    id: "",
    title: "",
    tutor: "",
    dateTime: "",
    mode: "Online",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("jac_schedule_sessions");
      if (raw) {
        setSessions(JSON.parse(raw));
      }
    } catch (e) {
      console.warn("Failed to load schedule sessions", e);
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem("jac_schedule_sessions", JSON.stringify(sessions));
    } catch (e) {
      console.warn("Failed to persist schedule sessions", e);
    }
  }, [sessions]);

  const handleFieldChange = (
    field: keyof Session,
    value: string | "Online" | "Physical"
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.dateTime.trim()) return;

    setSaving(true);
    const newSession: Session = {
      ...form,
      id: `sess_${Date.now()}`,
    };

    setSessions((prev) =>
      [...prev, newSession].sort((a, b) =>
        (a.dateTime || "").localeCompare(b.dateTime || "")
      )
    );

    setForm({
      id: "",
      title: "",
      tutor: "",
      dateTime: "",
      mode: "Online",
      notes: "",
    });
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const upcomingByDate = sessions.reduce<Record<string, Session[]>>(
    (acc, sess) => {
      const dateKey = sess.dateTime
        ? sess.dateTime.split("T")[0]
        : "No date";
      acc[dateKey] = acc[dateKey] || [];
      acc[dateKey].push(sess);
      return acc;
    },
    {}
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Schedule & Bookings
      </Typography>
      <Typography variant="subtitle1" color="grey.400" gutterBottom>
        Manage your upcoming Jac tutoring sessions and availability with more room
        to work comfortably.
      </Typography>

      <Grid
        container
        spacing={3}
        sx={{
          mt: 1,
          minHeight: "70vh",
        }}
      >
        {/* "Calendar" – grouped by date */}
        <Grid item xs={12} md={7}>
          <Card
            sx={{
              height: { xs: "auto", md: "72vh" },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardHeader title="Calendar" />
            <CardContent
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                pr: 1,
              }}
            >
              {sessions.length === 0 ? (
                <Typography color="grey.500">
                  No sessions yet. Add one on the right and it will appear here.
                </Typography>
              ) : (
                Object.entries(upcomingByDate).map(([date, list]) => (
                  <Box key={date} sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      color="secondary.main"
                      gutterBottom
                    >
                      {date}
                    </Typography>
                    {list.map((sess) => (
                      <Paper
                        key={sess.id}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          borderRadius: 2,
                        }}
                        variant="outlined"
                      >
                        <Box sx={{ pr: 2 }}>
                          <Typography fontWeight={600}>
                            {sess.title}
                          </Typography>
                          <Typography variant="body2" color="grey.400">
                            {sess.tutor || "Tutor TBD"} • {sess.mode}
                          </Typography>
                          {sess.dateTime && (
                            <Typography
                              variant="body2"
                              color="grey.400"
                              sx={{ mt: 0.5 }}
                            >
                              {new Date(sess.dateTime).toLocaleString()}
                            </Typography>
                          )}
                          {sess.notes && (
                            <Typography
                              variant="caption"
                              color="grey.500"
                              sx={{ display: "block", mt: 0.5 }}
                            >
                              {sess.notes}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          onClick={() => handleDelete(sess.id)}
                        >
                          Cancel
                        </Button>
                      </Paper>
                    ))}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Booking form – full height, roomy fields */}
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              height: { xs: "auto", md: "72vh" },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardHeader title="Book a new session" />
            <CardContent
              component="form"
              onSubmit={handleAddSession}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflowY: "auto",
                pr: 1,
              }}
            >
              <TextField
                label="Session title"
                fullWidth
                size="small"
                value={form.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
              />
              <TextField
                label="Tutor (optional)"
                fullWidth
                size="small"
                value={form.tutor}
                onChange={(e) => handleFieldChange("tutor", e.target.value)}
              />
              <TextField
                label="Date & time"
                type="datetime-local"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.dateTime}
                onChange={(e) => handleFieldChange("dateTime", e.target.value)}
              />
              <TextField
                label="Mode"
                fullWidth
                size="small"
                select
                SelectProps={{ native: true }}
                value={form.mode}
                onChange={(e) =>
                  handleFieldChange(
                    "mode",
                    e.target.value as "Online" | "Physical"
                  )
                }
              >
                <option value="Online">Online</option>
                <option value="Physical">Physical</option>
              </TextField>
              <TextField
                label="Notes (optional)"
                fullWidth
                size="small"
                multiline
                minRows={4}
                value={form.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
              />

              <Box sx={{ mt: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={
                    saving || !form.title.trim() || !form.dateTime.trim()
                  }
                >
                  {saving ? "Saving..." : "Add session"}
                </Button>
              </Box>
              <Typography variant="caption" color="grey.500">
                All data is stored locally in your browser for now, using the same
                dark theme.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SchedulePage;
