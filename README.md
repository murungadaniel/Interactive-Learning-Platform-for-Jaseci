# Interactive Learning Platform For Jaseci

**A complete AI-powered virtual classroom built using Jaseci (Jac), React, Gemini AI, and LiveKit.**

Jac Interactive Tutor is a next-generation educational platform designed for demos, hackathons, and workshops. It bridges the gap between live instruction and AI-driven self-paced learning, featuring real-time collaboration, automatic grading, and behavioral analytics.

---

## Key Features

### Tutor Role
* **Live Session Management:** Start and control virtual classrooms instantly.
* **Collaborative Whiteboard:** Draw and type in real-time with keyboard sync.
* **AI Quiz Generation:** Automatically generate MCQ quizzes based on lesson content.
* **Automated Evaluation:** AI-powered grading of student answers.
* **Analytics Dashboard:** Track student progress and engagement metrics.

### Learner Role
* **Easy Access:** Join sessions and view lessons without a mandatory login.
* **Interactive Tools:** Participate in classroom chat and draw/write on the shared whiteboard.
* **AI Quizzes:** Attempt 20-question MCQ sets per chapter with adaptive difficulty.
* **Progress Tracking:** Logged-in users can save scores and track history.

### AI Capabilities (Gemini Powered)
* **Smart Chat Assistant:** Context-aware Q&A.
* **Lesson-Aware Quizzes:** Questions generated directly from the current curriculum.
* **Adaptive Learning:** Difficulty adjusts based on user performance.
* **Behavioral Analytics:** Insights derived from user interaction patterns.

---

## 🛠 Tech Stack

* **Backend:** [Python 3.10+](https://www.python.org/), [Jaseci (Jac)](https://jaseci.org/)
* **AI Engine:** Google Gemini (`gemini-2.5-flash`)
* **Frontend:** [Node.js 18+](https://nodejs.org/), React, TypeScript, Vite, Material UI
* **Real-time Media:** [LiveKit](https://livekit.io/) (WebRTC)
* **Containerization:** Docker (for local LiveKit server)

---

## Folder Structure

```text
project-root/
│
├── backend/                # Jaseci & Python Backend
│   ├── app.jac             # Main Jac application logic
│   ├── livekit_token.py    # Token generation for WebRTC
│   ├── .env                # Backend environment variables
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React & TypeScript Frontend
│   ├── src/
│   │   ├── api.ts          # API integration
│   │   ├── theme.ts        # UI Theming (Material UI)
│   │   ├── pages/          # Application routes
│   │   ├── components/     # Reusable UI components
│   │   └── constants.ts    # Global constants
│   ├── vite.config.ts      # Vite configuration
│   └── package.json        # Node dependencies
│
└── livekit-local/          # Local LiveKit Infrastructure
    └── docker-compose.yml  # LiveKit container config
```

---

## ⚙️ Setup Instructions

### 1. Backend Setup
The backend handles the AI logic and session management.

```bash
cd backend

# Install dependencies
pip install -r requirements.txt
pip install jaseci
```

**Configuration:**
Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_actual_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash

API_BASE=http://localhost:8000 

LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
LIVEKIT_URL=wss://your-livekit-server:7880
```

**Start the Server:**
```bash
jac serve app.jac
```

### 2. Frontend Setup
The frontend provides the user interface for Tutors and Learners.

```bash
cd frontend

# Install dependencies
npm install
```

**Configuration:**
Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
```

**Start Development Server:**
```bash
npm run dev
```

### 3. Optional: Local LiveKit Server
If you want to use the video/audio features locally without a cloud provider.

```bash
cd livekit-local
docker compose up
```

---

## Analytics & Quiz Engine

### Quiz Mechanics
* **Structure:** 20 MCQs generated per lesson.
* **Timing:** 40-second timer per question.
* **Grading:** AI evaluates answers immediately.
* **Retry:** Unlimited retries allowed for mastery.

### Dashboard Metrics
The dashboard auto-updates in real-time to show:
* Lessons viewed
* Quiz attempts & scores
* Live session participation rates
* Time spent on platform
* Activity timeline

---

## Troubleshooting

If you encounter issues, please check the following common fixes:

| Issue | Potential Cause | Solution |
| :--- | :--- | :--- |
| **Blank Screen** | Theme Configuration | Ensure `theme.ts` has `export const jacTheme`. |
| | API URL | Check `VITE_API_BASE_URL` in frontend `.env`. |
| | Import Paths | Verify you are using `import { aiChat } from "../api";`. |
| **LiveKit Camera Fail** | Browser Permissions | Allow Camera/Mic access in browser settings. |
| | SSL Mismatch | Use `http` instead of `https` for local development. |
| | Wrong URL | Check `LIVEKIT_URL` in backend `.env`. |
| **Backend Error** | "No bytecode found" | Run `jac build app.jac` before serving. |

---

