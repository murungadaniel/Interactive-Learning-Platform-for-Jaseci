// src/pages/ProfilePage.tsx
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
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import { Role } from "../types";

type Profile = {
  name: string;
  email: string;
  bio: string;
  notifications: boolean;
};

interface ProfilePageProps {
  role: Role;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ role }) => {
  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    bio: "",
    notifications: true,
  });
  const [feedback, setFeedback] = useState("");
  const [snackbar, setSnackbar] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jac_profile");
      if (raw) {
        setProfile(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleProfileChange = (field: keyof Profile, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    try {
      localStorage.setItem("jac_profile", JSON.stringify(profile));
      setSnackbar("Profile saved locally (wire this to Jac auth later).");
    } catch {
      setSnackbar("Failed to save profile.");
    }
  };

  const handleClearProfile = () => {
    localStorage.removeItem("jac_profile");
    setProfile({
      name: "",
      email: "",
      bio: "",
      notifications: true,
    });
    setSnackbar("Profile cleared on this device.");
  };

  const handleSubmitFeedback = () => {
    if (!feedback.trim()) return;
    setFeedback("");
    setSnackbar("Thanks for your feedback! (Would be sent in a real backend.)");
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Profile & Settings
      </Typography>
      <Typography variant="subtitle1" color="grey.400" gutterBottom>
        Manage your personal information, preferences and feedback.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Profile details" />
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Full name"
                fullWidth
                size="small"
                value={profile.name}
                onChange={(e) => handleProfileChange("name", e.target.value)}
              />
              <TextField
                label="Email"
                fullWidth
                size="small"
                value={profile.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
              />
              <TextField
                label="Short bio"
                fullWidth
                size="small"
                multiline
                minRows={3}
                value={profile.bio}
                onChange={(e) => handleProfileChange("bio", e.target.value)}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                  label={
                    profile.notifications
                      ? "Notifications enabled"
                      : "Notifications disabled"
                  }
                  color={profile.notifications ? "secondary" : "default"}
                  onClick={() =>
                    handleProfileChange("notifications", !profile.notifications)
                  }
                />
                <Typography variant="caption" color="grey.500">
                  Tap to toggle email / in-app notifications.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                <Button variant="contained" onClick={handleSaveProfile}>
                  Save profile
                </Button>
                <Button color="error" variant="outlined" onClick={handleClearProfile}>
                  Clear
                </Button>
              </Box>
              <Typography variant="caption" color="grey.500">
                In the final hackathon build this would be wired to real Jac user
                graphs; right now it persists in your browser so it feels real.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Feedback on your Jac tutor"
              subheader={`You are currently viewing as ${role}.`}
            />
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Tell us what’s working, or what to improve"
                fullWidth
                size="small"
                multiline
                minRows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleSubmitFeedback}
                disabled={!feedback.trim()}
              >
                Submit feedback
              </Button>
              <Typography variant="caption" color="grey.500">
                In a full version this would go to a Jac walker that stores
                feedback in an OSP graph for tutors / admins.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          onClose={() => setSnackbar(null)}
          sx={{ width: "100%" }}
        >
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;
