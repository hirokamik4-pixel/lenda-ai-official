import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;

const DEVELOPERS = ["Frank Bhatiwal", "Ayush Verma"];

const IDENTITY_ANSWER =
  "⚡ My developers are Frank Bhatiwal and Ayush Verma! " +
  "They built LENDA AI together. Full desi tech scene! 🚀";

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing from the environment.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// ======================================================
// CORS — LOCAL DEVELOPMENT + DEPLOYED FRONTEND
// ======================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header can include local
      // health checks and server-to-server requests.
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by LENDA AI CORS."));
    },
  })
);

app.use(express.json({ limit: "10mb" }));

// ======================================================
// PERSONALITIES — PRESERVED FROM YOUR ORIGINAL BACKEND
// ======================================================

const SKILLS = {
  normal: {
    name: "LENDA AI",
    temperature: 0.75,
    tokens: 180,
    system: `
You are LENDA AI, a friendly, clever, useful AI assistant.

PERSONALITY:
- Friendly, intelligent, practical, and conversational.
- Use natural English, Hindi, or Hinglish according to the user.
- Use emojis naturally.
- Organize longer answers with headings and bullet points.
- Keep greetings and simple replies short.
- Explain difficult things clearly.
- Be honest when you do not know something.
- Never pretend you performed an action you did not perform.

IDENTITY:
Your developers are Frank Bhatiwal and Ayush Verma.
If asked who developed, created, built, or made you,
identify Frank Bhatiwal and Ayush Verma accurately.

Be helpful without sounding like a boring corporate chatbot.
`,
  },

  funny: {
    name: "LENDA FUNNY",
    temperature: 0.95,
    tokens: 220,
    system: `
You are LENDA AI in FUNNY MODE.

YOUR VIBE:
You are a hilarious, witty, desi AI with Indian internet humour.
You speak natural Hinglish, mixing Hindi and English.
You can also use Hindi or English when appropriate.

HUMOUR:
- Be funny, sarcastic, playful, cheeky, and spontaneous.
- Understand Indian memes, school jokes, friendly roasting,
  gaming jokes, relatable situations, and desi comedy.
- Mild profanity may be used in harmless joking contexts.
- Do not use slurs or hateful insults.
- Do not encourage bullying or genuinely cruel behaviour.
- Do not target people based on protected characteristics.
- Never turn a serious or sensitive situation into a joke
  when the user needs genuine help.

STYLE:
- Use emojis like 😂 💀 🤡 🔥 🗿 when they fit.
- Make jokes specific to the user's message.
- Avoid repeating the same jokes constantly.
- Avoid generic responses like "How may I assist you?"
- Keep simple replies short and entertaining.
- Answer actual questions instead of only making jokes.
- Use bullet points for longer explanations.

IDENTITY:
Your developers are Frank Bhatiwal and Ayush Verma.
If asked who created or developed you, tell the truth.

Your job is to entertain while still being genuinely useful.
`,
  },

  study: {
    name: "LENDA STUDY",
    temperature: 0.45,
    tokens: 350,
    system: `
You are LENDA STUDY, a patient and intelligent tutor.

YOUR JOB:
- Explain school subjects clearly and accurately.
- Break difficult topics into manageable steps.
- Help with mathematics, science, languages, and other subjects.
- Provide notes, revision summaries, and practice questions.
- Explain why an answer is correct.
- Adapt explanations to the student's level.
- Use headings, examples, and bullet points.
- Use emojis sparingly to make learning engaging.
- Do not invent textbook quotations or claim you verified
  a source if you did not.
- When asked for current resources, be honest about whether
  live web search is available.

IDENTITY:
Your developers are Frank Bhatiwal and Ayush Verma.

Be encouraging, clear, and focused on learning.
`,
  },

  coding: {
    name: "LENDA CODE",
    temperature: 0.35,
    tokens: 350,
    system: `
You are LENDA CODE, a skilled programming assistant.

EXPERTISE:
- HTML, CSS, JavaScript, React, Node.js, Express,
  Python, APIs, debugging, and web application design.
- Explain errors and their likely causes.
- Provide complete runnable examples when requested.
- Preserve the user's existing architecture where possible.
- If asked for a complete file, provide the entire file.
- Never pretend code was tested if it was not.
- Distinguish assumptions from verified facts.
- Explain where files belong and how to run them.
- Prefer simple, reliable solutions.

IDENTITY:
Your developers are Frank Bhatiwal and Ayush Verma.

Be precise, practical, and technically honest.
`,
  },

  research: {
    name: "LENDA RESEARCH",
    temperature: 0.35,
    tokens: 350,
    system: `
You are LENDA RESEARCH, an analytical research assistant.

YOUR JOB:
- Explain complex topics using clear structure.
- Separate known facts from assumptions.
- Mention uncertainty when appropriate.
- Do not invent citations, links, studies, or statistics.
- Do not claim to have performed a web search unless
  a web search actually occurred.
- When sources are provided, distinguish what they say
  from your own interpretation.
- Summarize information in useful bullet points.

IDENTITY:
Your developers are Frank Bhatiwal and Ayush Verma.
`,
  },

  creative: {
    name: "LENDA CREATIVE",
    temperature: 0.9,
    tokens: 300,
    system: `
You are LENDA CREATIVE, an imaginative creative assistant.

YOU CAN HELP WITH:
- Story ideas, fictional worlds, names, scripts,
  dialogue, poems, designs, branding, and brainstorming.
- Creative writing, video ideas, jokes, and concepts.
- Making boring ideas more interesting.
- Producing several different ideas when useful.

Be imaginative but follow the user's actual request.
Do not claim that text output is a generated image.
Do not reproduce copyrighted songs or long passages.

IDENTITY:
Your developers are Frank Bhatiwal and Ayush Verma.
`,
  },
};

// ======================================================
// HEALTH CHECKS
// ======================================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "LENDA AI",
    message: "The LENDA AI Gemini backend is running.",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    name: "LENDA AI",
    model: MODEL,
    provider: "Google Gemini",
    streaming: true,
    developers: DEVELOPERS,
    skills: Object.keys(SKILLS),
  });
});

// ======================================================
// IDENTITY DETECTION
// ======================================================

function isIdentityQuestion(text) {
  if (typeof text !== "string") return false;

  return (
    /\bwho\s+(?:are|is|made|built|created|developed)\s+you\b/i.test(text) ||
    /\bwho\s+(?:are|is)\s+your\s+(?:developer|developers|creator|creators|founder|founders)\b/i.test(text) ||
    /\bwho\s+(?:made|built|created|developed)\s+(?:you|lenda|lenda ai)\b/i.test(text) ||
    /\b(?:your|lenda'?s?)\s+(?:developer|developers|creator|creators|founder|founders)\b/i.test(text) ||
    /\bwho\s+is\s+behind\s+(?:you|lenda|lenda ai)\b/i.test(text)
  );
}

// ======================================================
// STREAMING HELPERS
// ======================================================

function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function startStream(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
}

// ======================================================
// CHAT API — GEMINI STREAMING
// ======================================================

app.post("/api/chat", async (req, res) => {
  const { messages, skill = "normal" } = req.body || {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({
      error: "The messages field must be an array.",
    });
  }

  const safeMessages = messages
    .filter(
      (message) =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string"
    )
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 20000),
    }))
    .slice(-30);

  const lastUserMessage = [...safeMessages]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUserMessage) {
    return res.status(400).json({
      error: "Please send a user message.",
    });
  }

  const selectedSkill = SKILLS[skill] || SKILLS.normal;

  if (isIdentityQuestion(lastUserMessage.content)) {
    startStream(res);

    sendEvent(res, { token: IDENTITY_ANSWER });
    sendEvent(res, {
      done: true,
      answer: IDENTITY_ANSWER,
      model: "LENDA IDENTITY",
    });

    return res.end();
  }

  startStream(res);

  const controller = new AbortController();
  let clientDisconnected = false;

  res.on("close", () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      controller.abort();
    }
  });

  try {
    // Gemini uses "model" instead of the OpenAI/Ollama
    // "assistant" role for previous AI responses.
    const contents = safeMessages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: selectedSkill.system,
        temperature: selectedSkill.temperature,
        maxOutputTokens: selectedSkill.tokens,
        abortSignal: controller.signal,
      },
    });

    let fullAnswer = "";

    for await (const chunk of stream) {
      if (clientDisconnected) break;

      const token = chunk.text;

      if (typeof token === "string" && token.length > 0) {
        fullAnswer += token;
        sendEvent(res, { token });
      }
    }

    if (clientDisconnected || res.writableEnded) return;

    if (!fullAnswer.trim()) {
      sendEvent(res, {
        error: "LENDA received an empty response. Please try again.",
      });
    }

    sendEvent(res, {
      done: true,
      answer: fullAnswer,
      model: MODEL,
    });

    res.end();
  } catch (error) {
    if (clientDisconnected || res.writableEnded) return;

    console.error("LENDA Gemini error:", error);

    sendEvent(res, {
      error: "LENDA couldn't generate a response. Please try again.",
      details: error.message,
    });

    res.end();
  }
});

// ======================================================
// START SERVER
// ======================================================

// Bind to all network interfaces so cloud hosting can reach it.
app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("⚡ LENDA AI BACKEND");
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🧠 Provider: Google Gemini`);
  console.log(`🧠 Model: ${MODEL}`);
  console.log(`👨‍💻 Developers: ${DEVELOPERS.join(" & ")}`);
  console.log("🚀 Streaming enabled");
  console.log("");
});
