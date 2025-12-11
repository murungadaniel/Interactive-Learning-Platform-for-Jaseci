import React, { useState } from "react";
import { askAI } from "../api/ai";

const QASection = ({ currentUser }) => {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const submit = async () => {
    if (!q.trim()) return;

    const tmp = {
      id: Date.now(),
      user: currentUser,
      question: q,
      answer: "Thinking...",
    };

    setItems([...items, tmp]);
    setQ("");

    const aiAnswer = await askAI(q);

    setItems((prev) =>
      prev.map((i) => (i.id === tmp.id ? { ...i, answer: aiAnswer } : i))
    );
  };

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <h3>Q&A</h3>

      {items.map((i) => (
        <div key={i.id} style={{ marginBottom: 10 }}>
          <b>{i.user} asks:</b>
          <div>{i.question}</div>
          <div style={{ color: "#3fe0c5", marginTop: 4 }}>
            <b>AI:</b> {i.answer}
          </div>
        </div>
      ))}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ask a question..."
        style={{ width: "100%", padding: 8 }}
      />
      <button onClick={submit}>Send</button>
    </div>
  );
};

export default QASection;
