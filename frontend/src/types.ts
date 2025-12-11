// src/types.ts
export type Role = "Student" | "Tutor";

export type ChatMessage = {
  from: "ai" | "you";
  text: string;
};
