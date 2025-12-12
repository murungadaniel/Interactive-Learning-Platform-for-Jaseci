::py::
import os
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
OWNER = "jaseci-labs"
REPO = "jaseci"
BRANCH = "main"
BOOK_PATH = "docs/docs/jac_book"   # folder where chapter .md files live

def _github_raw_url(path: str) -> str:
    """
    Build a raw.githubusercontent.com URL for a given repo path.
    Example:
      path = "docs/docs/jac_book/chapter_1.md"
    """
    return f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/{path}"

def fetch_lessons_index():
    """
    Return a list of lesson metadata for chapter_1.md ... chapter_20.md
    from the official Jac Book in the jaseci repo.

    Shape:
    [
      {
        "id": "chapter_1",
        "title": "Chapter 1",
        "description": "Jac Book Chapter 1",
        "github_path": "docs/docs/jac_book/chapter_1.md",
      },
      ...
    ]
    """
    lessons = []
    for i in range(1, 21):
        fname = f"chapter_{i}.md"
        lesson_id = f"chapter_{i}"
        title = f"Chapter {i}"
        github_path = f"{BOOK_PATH}/{fname}"
        lessons.append(
            {
                "id": lesson_id,
                "title": title,
                "description": f"Jac Book {title}",
                "github_path": github_path,
            }
        )
    return lessons

def fetch_lesson_content(github_path: str) -> str:
    """
    Fetch the markdown content of a single chapter from GitHub.
    github_path is e.g. "docs/docs/jac_book/chapter_1.md"
    """
    url = _github_raw_url(github_path)
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.text

def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

try:
    import google.generativeai as genai

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)

    def ask_gemini(prompt: str) -> str:
        """
        Call Gemini to answer a Jac tutor question.
        """
        if not GEMINI_API_KEY:
            return "Gemini API key not configured on server."
        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            resp = model.generate_content(prompt)
            if hasattr(resp, "text") and resp.text:
                return resp.text
            return "Gemini returned no text."
        except Exception as e:
            return f"Error calling Gemini: {e}"
except ImportError:
    # Fallback if google-generativeai is not installed
    def ask_gemini(prompt: str) -> str:
        return "google-generativeai is not installed on the server. Ask your tutor to add it to requirements.txt."
::py::

# A learner; you can expand this later with auth, etc.
node User {
    has user_id: str;
    has name: str;
}

# A lesson = one chapter from the Jac Book
node Lesson {
    has lesson_id: str;      # e.g. "chapter_1"
    has title: str;          # human-readable title
    has description: str;    # optional short description
    has github_path: str;    # e.g. "docs/docs/jac_book/chapter_1.md"
}

# A user's progress/score on a lesson
node LessonAttempt {
    has user_id: str;
    has lesson_id: str;
    has status: str;          # e.g. "started", "completed"
    has timestamp: str = "";  # we will set this via now_iso()
    has score: float = 0.0;   # 0..1 for now
}

edge UserAttempt {}    # User --UserAttempt--> LessonAttempt
edge AttemptLesson {}  # LessonAttempt --AttemptLesson--> Lesson

# WALKER: Sync lessons from GitHub Jac Book
walker sync_lessons_from_github {
    can sync with `root entry {
        # Fetch list of .md files in docs/docs/jac_book
        lessons_data = fetch_lessons_index();

        # Build map of existing Lesson nodes by lesson_id
        existing_lessons = [-->(`?Lesson)];
        existing_by_id = {};
        for l in existing_lessons {
            existing_by_id[l.lesson_id] = l;
        }

        created = [];
        updated = [];

        # Upsert Lesson nodes
        for raw in lessons_data {
            id = raw["id"];
            title = raw["title"];
            description = raw["description"];
            github_path = raw["github_path"];

            lesson_node = None;

            if id in existing_by_id {
                lesson_node = existing_by_id[id];
                lesson_node.title = title;
                lesson_node.description = description;
                lesson_node.github_path = github_path;
                updated.append(lesson_node);
            } else {
                lesson_node = here ++> Lesson(
                    lesson_id   = id,
                    title       = title,
                    description = description,
                    github_path = github_path
                );
                created.append(lesson_node);
            }
        }

        report {
            "created": created,
            "updated": updated
        };
    }
}

# WALKER: List lessons (all chapters)
walker list_lessons {
    can list with `root entry {
        lessons = [-->(`?Lesson)];
        result = [];

        for l in lessons {
            result.append({
                "id": l.lesson_id,
                "title": l.title,
                "description": l.description,
            });
        }

        # you can sort here too if you like, but they are already stable from sync
        report result;
    }
}

# WALKER: Get single lesson + markdown content
walker get_lesson_detail {
    has lesson_id: str;

    can get with `root entry {
        lessons = [-->(`?Lesson)];
        target = None;

        for l in lessons {
            if l.lesson_id == self.lesson_id {
                target = l;
                break;
            }
        }

        if not target {
            report {
                "error": "lesson_not_found",
                "lesson_id": self.lesson_id
            };
            return;
        }

        content = "";
        if target.github_path {
            content = fetch_lesson_content(target.github_path);
        }

        report {
            "id": target.lesson_id,
            "title": target.title,
            "description": target.description,
            "github_path": target.github_path,
            "content": content
        };
    }
}

# WALKER: Record user progress/score on a lesson
walker record_attempt {
    has user_id: str;
    has lesson_id: str;
    has status: str;          # e.g. "started", "completed"
    has score: float = 0.0;   # 0..1

    can save with `root entry {
        # Ensure user exists
        users = [-->(`?User)];
        user_node = None;

        for u in users {
            if u.user_id == self.user_id {
                user_node = u;
                break;
            }
        }

        if not user_node {
            user_node = here ++> User(
                user_id = self.user_id,
                name    = self.user_id
            );
        }

        # Find lesson
        lessons = [-->(`?Lesson)];
        lesson_node = None;

        for l in lessons {
            if l.lesson_id == self.lesson_id {
                lesson_node = l;
                break;
            }
        }

        if not lesson_node {
            report {
                "error": "lesson_not_found",
                "lesson_id": self.lesson_id
            };
            return;
        }

        # Create attempt node + edges
        attempt = here ++> LessonAttempt(
            user_id   = self.user_id,
            lesson_id = self.lesson_id,
            status    = self.status,
            score     = self.score,
            timestamp = now_iso()
        );

        user_node +>:UserAttempt:+> attempt;
        attempt +>:AttemptLesson:+> lesson_node;

        report {
            "attempt_id": attempt.jid,
            "user_id": attempt.user_id,
            "lesson_id": attempt.lesson_id,
            "status": attempt.status,
            "score": attempt.score,
            "timestamp": attempt.timestamp
        };
    }
}

# (Optional) WALKER: Get attempts for a user – for a "My Progress" page
walker get_user_attempts {
    has user_id: str;

    can get with `root entry {
        attempts = [-->(`?LessonAttempt)];
        result = [];

        for a in attempts {
            if a.user_id != self.user_id { continue; }

            result.append({
                "lesson_id": a.lesson_id,
                "status": a.status,
                "score": a.score,
                "timestamp": a.timestamp
            });
        }

        report result;
    }
}

walker ai_chat {
    has message: str;

    can chat with `root entry {
        full_prompt = """
You are JacTutor, a concise AI assistant helping students learn Jac programming and related concepts.

Answer the student's question with:
- Plain text only (no markdown, no bullet points, no headings, no bold).
- A direct, focused explanation of exactly what they asked.
- 3–6 short sentences unless they explicitly ask for a long or step-by-step answer.
- No introductions like "Sure!" or "Here's your answer".

Student question:
""" + self.message;

        reply = ask_gemini(full_prompt);
        report {"reply": reply};
    }
}


walker get_livekit_token {
    has id: str;      # user id, e.g. "demo_user"
    has room: str;    # room name, e.g. "jac-class-1"
    has url: str;     # LiveKit server URL (ws://... or wss://...)
    has token: str;   # LiveKit access token (JWT)

    can request with `root entry {
        #
        # NOTE: This is the minimal, compiling version.
        # ----------------------------------------------
        # 1. For local dev, LiveKit server default URL is usually:
        #      ws://localhost:7880
        # 2. Replace the hard-coded token with a real JWT generated by
        #    a small Python helper using livekit-api (see comment below).
        #

        url = "ws://localhost:7880";

        #
        # TODO: Replace this with a real LiveKit access token.
        # You’ll typically generate it in Python with:
        #
        #   from livekit.api import AccessToken
        #
        #   def create_token(user_id: str, room: str) -> str:
        #       at = AccessToken()
        #       at.identity = user_id
        #       at.add_grant({"roomJoin": True, "room": room})
        #       return at.to_jwt()
        #
        # Then expose that via a tiny HTTP endpoint or call it
        # from Jac using whatever Python bridge you prefer.
        #
        token = "REPLACE_ME_WITH_REAL_LIVEKIT_JWT";

        report {
            "id": id,
            "room": room,
            "url": url,
            "token": token,
        };
    }
}
walker generate_quiz_questions {
    has lesson_id: str;

    can ask with `root entry {
        # Fetch chapter content
        lessons = [-->(`?Lesson)];
        target = None;

        for l in lessons {
            if l.lesson_id == self.lesson_id {
                target = l;
                break;
            }
        }

        if not target {
            report {"error": "lesson_not_found"};
            return;
        }

        chapter = fetch_lesson_content(target.github_path);

        prompt = """
Generate 20 multiple choice questions (MCQs) from this Jac chapter.
Rules:
- Plain text only.
- No markdown.
- Each question must have exactly 4 options: A, B, C, D.
- Correct answer must be indicated as: Correct: A
- Keep questions short and based ONLY on the chapter.

Chapter:
""" + chapter;

        text = ask_gemini(prompt);
        report {"questions_raw": text};
    }
}
walker evaluate_answer {
    has question: str;
    has selected: str;

    can check with `root entry {
        prompt = """
Evaluate this MCQ answer.

Rules:
- Reply ONLY in this JSON format:
{"correct": true/false, "explanation": "short explanation"}

Do not add markdown.

Question:
""" + self.question + """

Student selected: """ + self.selected;

        reply = ask_gemini(prompt);
        report {"eval": reply};
    }
}
walker quiz_record_attempt {
    has user_id: str;
    has lesson_id: str;
    has correct: int;
    has wrong: int;

    can save with `root entry {
        
        score = 0.0;

        total = self.correct + self.wrong;
        if total > 0 {
            score = self.correct / total;
        }

        attempt = here ++> LessonAttempt(
            user_id = self.user_id,
            lesson_id = self.lesson_id,
            status = "quiz_completed",
            score = score,
            timestamp = now_iso()
        );

        report {
            "lesson_id": self.lesson_id,
            "correct": self.correct,
            "wrong": self.wrong,
            "score": score
        };
    }
}

# Entry block for quick sanity check
with entry {
    print("Jac Interactive Tutor backend loaded.");
    print("Available walkers:");
    print("  - sync_lessons_from_github");
    print("  - list_lessons");
    print("  - get_lesson_detail");
    print("  - record_attempt");
    print("  - get_user_attempts");
}
