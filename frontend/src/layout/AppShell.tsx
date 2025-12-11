// src/layout/AppShell.tsx
import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Chip,
  Badge,
  Button,
  Snackbar,
  Alert,
  Tooltip,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Tabs,
  Tab,
  DialogActions,
  Box as MBox,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  VideoCameraFront as VideoIcon,
  Chat as ChatIcon,
  Insights as InsightsIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Notifications as NotificationsIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { Role } from "../types";
import { loginJacUser, signupJacUser, logoutJacUser } from "../api";
import type { AuthUser } from "../api";

const drawerWidth = 260;

// Jac / Jaseci brand colors
const JAC_BG = "#0B1024";
const JAC_SIDEBAR = "#0F1831";
const JAC_ACCENT = "#5BE0B3";

// Navigation items configuration - icons are rendered inside the component
const getNavItemsConfig = (isAuthenticated: boolean) => {
  const baseItems = [
    { label: "Jac Book", iconName: "School", path: "/", requireAuth: false },
  ];
  
  if (isAuthenticated) {
    return [
      ...baseItems,
      { label: "Dashboard", iconName: "Dashboard", path: "/dashboard", requireAuth: true },
      { label: "Virtual Classroom", iconName: "Video", path: "/classroom", requireAuth: true },
      { label: "Schedule", iconName: "Calendar", path: "/schedule", requireAuth: true },
      { label: "Analytics", iconName: "Insights", path: "/analytics", requireAuth: true },
      { label: "Profile", iconName: "Person", path: "/profile", requireAuth: true },
    ];
  }
  
  return baseItems;
};

interface AppShellProps {
  children: React.ReactNode;
  role: Role;
  setRole: (r: Role) => void;
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;
}

const AppShell: React.FC<AppShellProps> = ({
  children,
  role,
  setRole,
  authUser,
  setAuthUser,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const isSmUp = useMediaQuery("(min-width:900px)");
  const location = useLocation();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleAuthSubmit = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const user =
        authTab === "login"
          ? await loginJacUser(username.trim(), password.trim())
          : await signupJacUser(username.trim(), password.trim());
      setAuthUser(user);
      setAuthDialogOpen(false);
    } catch (e: any) {
      setAuthError(e?.message ?? "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logoutJacUser();
    setAuthUser(null);
  };

  const canSubmit = useMemo(
    () => username.trim().length >= 3 && password.trim().length >= 6,
    [username, password]
  );

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: "white",
        bgcolor: JAC_SIDEBAR,
      }}
    >
      {/* Brand / user block */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar
          sx={{
            bgcolor: JAC_ACCENT,
            width: 32,
            height: 32,
            fontWeight: 700,
          }}
        >
          J
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Jac Tutor
          </Typography>
          <Chip
            label={role}
            size="small"
            color="default"
            variant="outlined"
            sx={{
              borderColor: "rgba(255,255,255,0.3)",
              color: "rgba(255,255,255,0.8)",
              height: 22,
            }}
          />
        </Box>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* NAV ITEMS */}
      <List sx={{ flexGrow: 1, py: 1 }}>
        {getNavItemsConfig(!!authUser).map((item) => {
          const selected = location.pathname === item.path;
          // Render icon based on iconName
          const getIcon = () => {
            switch (item.iconName) {
              case "School": return <SchoolIcon />;
              case "Dashboard": return <DashboardIcon />;
              case "Video": return <VideoIcon />;
              case "Calendar": return <CalendarIcon />;
              case "Insights": return <InsightsIcon />;
              case "Person": return <PersonIcon />;
              default: return <SchoolIcon />;
            }
          };
          return (
            <ListItem key={item.label} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={selected}
                sx={{
                  borderLeft: selected
                    ? `3px solid ${JAC_ACCENT}`
                    : "3px solid transparent",
                  pl: selected ? 1.5 : 2,
                  "&.Mui-selected": {
                    bgcolor: "rgba(245,143,41,0.12)",
                    "&:hover": {
                      bgcolor: "rgba(245,143,41,0.18)",
                    },
                  },
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.04)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "inherit",
                    minWidth: 36,
                  }}
                >
                  {getIcon()}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* ROLE SWITCHER */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
          Quick role switch
        </Typography>
        <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
          <Button
            fullWidth
            size="small"
            variant={role === "Student" ? "contained" : "outlined"}
            onClick={() => setRole("Student")}
            sx={{
              textTransform: "none",
              fontSize: 12,
              bgcolor: role === "Student" ? JAC_ACCENT : "transparent",
              borderColor:
                role === "Student"
                  ? JAC_ACCENT
                  : "rgba(255,255,255,0.3)",
              "&:hover": {
                bgcolor:
                  role === "Student"
                    ? "#6bf0c2"
                    : "rgba(255,255,255,0.08)",
              },
            }}
          >
            Student
          </Button>
          <Button
            fullWidth
            size="small"
            variant={role === "Tutor" ? "contained" : "outlined"}
            onClick={() => setRole("Tutor")}
            sx={{
              textTransform: "none",
              fontSize: 12,
              bgcolor: role === "Tutor" ? JAC_ACCENT : "transparent",
              borderColor:
                role === "Tutor"
                  ? JAC_ACCENT
                  : "rgba(255,255,255,0.3)",
              "&:hover": {
                bgcolor:
                  role === "Tutor"
                    ? "#6bf0c2"
                    : "rgba(255,255,255,0.08)",
              },
            }}
          >
            Tutor
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: JAC_BG,
      }}
    >
      <CssBaseline />

      {/* TOP APP BAR */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: JAC_BG,
          color: "#FFFFFF",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "none",
        }}
      >
        <Toolbar>
          {!isSmUp && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Jac Interactive Tutor
          </Typography>
          <Chip
            label={role}
            size="small"
            sx={{
              mr: 2,
              fontWeight: 600,
              bgcolor: "rgba(255,255,255,0.05)",
              color: "#FFFFFF",
              borderColor: "rgba(255,255,255,0.3)",
            }}
            variant="outlined"
          />
          {authUser ? (
            <Chip
              label={`Hi, ${authUser.username}`}
              color="secondary"
              size="small"
              sx={{ mr: 1 }}
            />
          ) : (
            <Chip
              label="Guest"
              color="default"
              size="small"
              sx={{ mr: 1 }}
            />
          )}
          <Button
            color="inherit"
            startIcon={authUser ? <LogoutIcon /> : <LoginIcon />}
            onClick={() => (authUser ? handleLogout() : setAuthDialogOpen(true))}
            variant="outlined"
            sx={{ borderColor: "rgba(255,255,255,0.4)", mr: 1 }}
          >
            {authUser ? "Logout" : "Login / Signup"}
          </Button>
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={() => setNotifOpen(true)}
              sx={{ mr: 1 }}
            >
              <Badge color="warning" variant="dot">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          {/* Simple static avatar – no login/logout */}
          <Avatar
            sx={{
              bgcolor: JAC_ACCENT,
              width: 32,
              height: 32,
              fontWeight: 700,
            }}
          >
            PB
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* DRAWER */}
      {isSmUp ? (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              bgcolor: JAC_SIDEBAR,
              color: "#FFFFFF",
              borderRight: "1px solid rgba(255,255,255,0.08)",
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              bgcolor: JAC_SIDEBAR,
              color: "#FFFFFF",
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* MAIN CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 10,
          minHeight: "100vh",
          bgcolor: JAC_BG,
        }}
      >
        {children}
      </Box>

      {/* NOTIFICATIONS */}
      <Snackbar
        open={notifOpen}
        autoHideDuration={4000}
        onClose={() => setNotifOpen(false)}
      >
        <Alert
          severity="info"
          onClose={() => setNotifOpen(false)}
          sx={{ width: "100%" }}
        >
          Upcoming session with Tutor Jane at 6:00 PM EAT (demo notification).
        </Alert>
      </Snackbar>

      {/* AUTH DIALOG */}
      <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{authTab === "login" ? "Login" : "Create account"}</DialogTitle>
        <Tabs
          value={authTab}
          onChange={(_, v) => setAuthTab(v)}
          variant="fullWidth"
        >
          <Tab value="login" label="Login" />
          <Tab value="signup" label="Sign up" />
        </Tabs>
        <DialogContent>
          <MBox display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            {authError && (
              <Alert severity="error" onClose={() => setAuthError(null)}>
                {authError}
              </Alert>
            )}
          </MBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAuthDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAuthSubmit}
            disabled={!canSubmit || authLoading}
          >
            {authLoading ? "Please wait..." : authTab === "login" ? "Login" : "Sign up"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppShell;
