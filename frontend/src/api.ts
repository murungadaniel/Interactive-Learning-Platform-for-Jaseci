// src/api.ts
// Central Jac API client + typed helpers

// ------------ Types ------------
export type LessonSummary = {
  lesson_id: string; // local ID, mapped from backend "id"
  title: string;
  description?: string;
};

export type LessonDetail = LessonSummary & {
  github_path?: string;
  content: string;
};

export type LessonAttempt = {
  lesson_id: string;
  status: string;
  score: number;
  timestamp: string;
};

type JacAuth = {
  token: string;
  root_id: string;
};

export type AuthUser = {
  username: string;
  token: string;
  root_id: string;
};

// ------------ Base URL ------------
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ------------ Auth helpers ------------

const USER_AUTH_KEY = "jac_user_auth";
const GUEST_AUTH_KEY = "jac_guest_auth";

function loadAuth(key: string): JacAuth | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JacAuth;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function storeAuth(key: string, auth: JacAuth) {
  localStorage.setItem(key, JSON.stringify(auth));
}

export function logoutJacUser() {
  localStorage.removeItem(USER_AUTH_KEY);
}

export async function signupJacUser(
  username: string,
  password: string
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/user/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Signup failed: ${res.status} ${text || "<empty>"}`);
  }
  const data = await res.json();
  const auth: AuthUser = {
    username,
    token: data.token,
    root_id: data.root_id,
  };
  storeAuth(USER_AUTH_KEY, { token: auth.token, root_id: auth.root_id });
  return auth;
}

export async function loginJacUser(
  username: string,
  password: string
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text || "<empty>"}`);
  }

  const data = await res.json();
  const auth: AuthUser = {
    username,
    token: data.token,
    root_id: data.root_id,
  };
  storeAuth(USER_AUTH_KEY, { token: auth.token, root_id: auth.root_id });
  return auth;
}

async function getJacAuth(useGuest: boolean): Promise<JacAuth> {
  const key = useGuest ? GUEST_AUTH_KEY : USER_AUTH_KEY;
  const cached = loadAuth(key);
  if (cached) return cached;

  // For guests we create a temporary account to read content.
  if (useGuest) {
    const res = await fetch(`${API_BASE_URL}/user/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `guest_${Date.now()}`,
        password: "guest_password",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Failed to create guest user: ${res.status} ${text || "<empty>"}`
      );
    }

    const data = await res.json();
    const auth: JacAuth = { token: data.token, root_id: data.root_id };
    storeAuth(key, auth);
    return auth;
  }

  throw new Error("Not authenticated. Please log in.");
}

function ensureUserAuthOrThrow(): JacAuth {
  const auth = loadAuth(USER_AUTH_KEY);
  if (!auth) {
    throw new Error("Please log in to access this feature.");
  }
  return auth;
}

/**
 * Low-level helper: call any Jac walker via HTTP.
 * IMPORTANT: body is just the fields object (no {fields: …} wrapper).
 */
export async function callWalker(
  name: string,
  fields: Record<string, any> = {},
  opts: { requireUser?: boolean } = {}
): Promise<{ result: any; reports: any[] }> {
  const { token } = opts.requireUser
    ? ensureUserAuthOrThrow()
    : await getJacAuth(true);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/walker/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(fields),
    });
  } catch (netErr) {
    console.error(`Network error calling walker ${name}:`, netErr);
    throw new Error(`Network error calling walker ${name}`);
  }

  const text = await res.text();

  if (!res.ok) {
    console.error(
      `Walker ${name} failed with status ${res.status}:`,
      text || "<empty body>"
    );
    throw new Error(`Walker ${name} failed: ${res.status} ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (parseErr) {
    console.error(`Failed to parse JSON from walker ${name}:`, text);
    throw new Error(`Invalid JSON from walker ${name}`);
  }
}

// ------------ Lesson helpers ------------

export async function syncLessonsFromGithub(): Promise<void> {
  await callWalker("sync_lessons_from_github", {});
}

export async function listLessons(): Promise<LessonSummary[]> {
  const { reports } = await callWalker("list_lessons", {});
  const raw = (reports?.[0] as any[]) || [];
  return raw.map((d) => ({
    lesson_id: d.id ?? d.lesson_id,
    title: d.title,
    description: d.description ?? "",
  }));
}

export async function getLessonDetail(
  lessonId: string
): Promise<LessonDetail> {
  const { reports } = await callWalker("get_lesson_detail", {
    lesson_id: lessonId,
  });
  const detail = (reports?.[0] as any) || {};
  return {
    lesson_id: detail.id ?? detail.lesson_id,
    title: detail.title,
    description: detail.description ?? "",
    github_path: detail.github_path,
    content: detail.content ?? "",
  };
}

// ------------ Progress helpers ------------

export async function recordAttempt(params: {
  user_id: string;
  lesson_id: string;
  status: string;
  score?: number;
}): Promise<any> {
  const { user_id, lesson_id, status, score = 0 } = params;
  const { reports } = await callWalker("record_attempt", {
    user_id,
    lesson_id,
    status,
    score,
  }, { requireUser: true });
  return reports?.[0];
}

export async function getUserAttempts(
  user_id: string
): Promise<LessonAttempt[]> {
  const { reports } = await callWalker("get_user_attempts", { user_id }, { requireUser: true });
  const raw = (reports?.[0] as any[]) || [];
  return raw.map((a) => ({
    lesson_id: a.lesson_id,
    status: a.status,
    score: typeof a.score === "number" ? a.score : Number(a.score ?? 0),
    timestamp: a.timestamp,
  }));
}

// ------------ AI chat ------------

export async function aiChat(message: string): Promise<string> {
  const { reports } = await callWalker("ai_chat", { message });
  const payload = (reports?.[0] || {}) as { reply?: string };
  return payload.reply ?? "(No reply from AI tutor)";
}

// ------------ LiveKit token helper ------------

export interface LivekitTokenResponse {
  id: string; // user id
  room: string; // room name
  url: string; // LiveKit server URL
  token: string; // JWT
}

// ------------ LiveKit helper (optional) ------------

export interface LivekitTokenResponse {
  id: string;    // user id
  room: string;  // room name
  url: string;   // LiveKit server URL, e.g. ws://localhost:7880
  token: string; // LiveKit access token (JWT)
}

export async function getLivekitToken(params: {
  id: string;
  room: string;
}): Promise<LivekitTokenResponse> {
  const res = await fetch(
    `${API_BASE_URL}/walker/get_livekit_token?op=request`, // ✅ use API_BASE_URL
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch LiveKit token (status ${res.status})`);
  }

  const data = (await res.json()) as LivekitTokenResponse;
  return data;
}
// ------------ Quiz helpers ------------

// ------------ Quiz helpers (AI-generated MCQs) ------------

/**
 * Generate a block of MCQs for a given lesson by:
 *  1) Fetching the lesson content from GitHub via getLessonDetail()
 *  2) Asking the AI tutor (Gemini) to create 20 MCQs in a simple text format.
 */
export async function generateQuizQuestions(
  lessonId: string
): Promise<string> {
  // Reuse your existing lesson detail helper
  const detail = await getLessonDetail(lessonId);

  const prompt = `
You are an AI tutor for the Jac programming language.

Using ONLY the following chapter content:

---
${detail.content.slice(0, 8000)}
---

Generate exactly 20 multiple-choice questions (MCQs) to test understanding.
Format them as plain text like:

1. Question text...
A) Option 1
B) Option 2
C) Option 3
D) Option 4
Correct: B

2. Next question...
A) ...
B) ...
C) ...
D) ...
Correct: A

Do NOT add extra commentary. Only output the questions in this format.
`;

  const raw = await aiChat(prompt);
  return raw;
}

/**
 * Ask the AI to evaluate one answer and respond with a tiny JSON blob:
 * {"correct": true/false, "explanation": "short explanation"}
 */
export async function evaluateAnswer(
  questionWithOptions: string,
  chosenOption: string
): Promise<string> {
  const prompt = `
You are grading a multiple-choice question for Jac programming.

Question and options:
${questionWithOptions}

The student chose option: ${chosenOption}

Respond ONLY with a single JSON object like:
{"correct": true, "explanation": "Very short explanation here."}

No extra text outside the JSON.
`;

  const raw = await aiChat(prompt);
  // QuizzesPage will try to JSON.parse this; we just return the raw text.
  return raw;
}

/**
 * Run Jac code through the AI runner (simulated execution).
 */
export async function runJacCode(code: string): Promise<string> {
  const prompt = `
You are a Jac interpreter and strict syntax checker for the Jac language.
If the code has any syntax/parse error (missing semicolons, indentation, walker definition issues), respond with a single line starting with:
ERROR: <short message>
Otherwise, execute and return ONLY the program output (stdout), no extra text.

Code:
---
${code}
---
`;
  const raw = await aiChat(prompt);
  return raw;
}

/**
 * Save quiz result by mapping it to the existing record_attempt walker.
 * Score is computed as correct / (correct + wrong).
 */
export async function saveQuizResult(
  user_id: string,
  lesson_id: string,
  correct: number,
  wrong: number
): Promise<void> {
  const total = correct + wrong;
  const score = total > 0 ? correct / total : 0;
  await recordAttempt({
    user_id,
    lesson_id,
    status: "quiz_completed",
    score,
  });
}
