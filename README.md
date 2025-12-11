
 Jac Interactive Tutor
A complete AI-powered virtual classroom built using Jaseci (Jac), React, Gemini AI, and optional LiveKit/WebRTC.
This project is ideal for demos, hackathons, workshops, and building educational AI systems.

Features
 Tutor Role

Start live sessions
Control virtual classroom
Write on shared whiteboard (live + keyboard typing sync)
Generate AI-powered MCQ quizzes
Evaluate student answers automatically
Track student progress
Access analytics dashboard

 Learner Role

Join tutor’s session
View lessons without login
Use classroom chat
Draw/write on whiteboard
Attempt AI-generated quizzes (20 MCQs per chapter)
Track progress if logged in

 AI Features
Smart AI chat assistant
Lesson-aware quiz generation
Automatic quiz grading
Adaptive difficulty
Analytics based on user behavior

 Folder Structure
project-root/
│
├── backend/
│   ├── app.jac
│   ├── livekit_token.py
│   ├── .env
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api.ts
│   │   ├── theme.ts
│   │   ├── pages/
│   │   ├── components/
│   │   └── constants.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .env
│
└── livekit-local/
    └── docker-compose.yml

 Requirements
Backend
Python 3.10+
Jaseci
Gemini API key
Optional LiveKit server

Frontend
Node.js 18+
React + Typescript
Vite
Material UI

Setup Instructions
1. Backend Setup
cd backend
pip install -r requirements.txt
pip install jaseci


Create .env:
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
LIVEKIT_URL=ws://localhost:7880


Start server:

jac serve app.jac

2. Frontend Setup
cd frontend
npm install


Create .env:
VITE_API_BASE_URL=http://localhost:8000

Start dev server:
npm run dev

ptional: Local LiveKit Server
cd livekit-local
docker compose up

Analytics (Automatic)
Lessons viewed
Quiz attempts
Scores
Live session participation
Time spent
Activity timeline

Dashboard auto-updates based on real user interactions.
Quiz Engine
20 MCQs per lesson
AI generates questions from lesson content
40s timer per question
AI evaluates answers
Score automatically saved
Retry unlimited times

❗ Troubleshooting
Blank screen
Check:
theme.ts has export const jacTheme
/frontend/.env has correct API URL
Your import paths use:
import { aiChat } from "../api";
LiveKit not opening camera
Browser blocked permissions
Wrong URL in .env
Docker not running
SSL mismatch (use http instead of https for dev)
Backend “No bytecode found”

Run:

jac build app.jac
jac serve app.jac