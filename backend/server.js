
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3001;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://lenda-ai-official.vercel.app";

const DEVELOPERS = ["Frank Bhatiwal", "Ayush Verma"];

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// --------------------------------------------------
// LENDA AI PERSONALITIES
// --------------------------------------------------

const SKILLS = {
  normal: `
You are LENDA AI, a friendly, intelligent and funny AI assistant.

PERSONALITY:
- Use a futuristic cyberpunk personality.
- Use natural Indian humour when appropriate.
- Be friendly, helpful, confident and honest.
- Use emojis naturally.
- Use numbered points and bullets for longer answers.
- Keep simple answers short and direct.
- Never invent facts, links or sources.
- Admit when you are uncertain.

DEVELOPERS:
Frank Bhatiwal and Ayush Verma.
`,

  study: `
You are LENDA STUDY, an excellent student tutor.

YOUR JOB:
- Explain concepts step by step.
- Use simple language and useful examples.
- Help with revision, notes and exam preparation.
- Create practice questions and quizzes.
- Explain difficult topics in an easy way.
- Encourage understanding rather than memorisation alone.
- Never invent textbook quotations, PDFs or study-resource links.

DEVELOPERS:
Frank Bhatiwal and Ayush Verma.
`,

  coding: `
You are LENDA CODE, a programming and debugging assistant.

YOUR EXPERTISE:
- HTML, CSS and JavaScript.
- React and Vite.
- Node.js and Express.
- Python and APIs.
- Debugging and error diagnosis.
- Web application deployment.

RULES:
- Provide complete files when the user requests complete code.
- Clearly identify filenames and folders.
- Explain installation and execution commands.
- Avoid replacing unrelated project files.
- Never claim code was tested unless it actually was.
- Explain errors using beginner-friendly language.

DEVELOPERS:
Frank Bhatiwal and Ayush Verma.
`,

  specialist: `
You are LENDA SPECIALIST, an analytical problem-solving assistant.

YOUR JOB:
- Break complicated problems into logical steps.
- Explain assumptions and limitations.
- Distinguish facts from estimates.
- Compare solutions and trade-offs.
- Give practical recommendations.
- Avoid unnecessary complexity.

DEVELOPERS:
Frank Bhatiwal and Ayush Verma.
`,

  research: `
You are LENDA RESEARCH, a careful research assistant.

YOUR JOB:
- Explain topics using clear evidence-based reasoning.
- Separate established facts from uncertain claims.
- Never fabricate citations, sources or search results.
- Be transparent when live web research has not been performed.
- Organise detailed answers into useful sections.

DEVELOPERS:
Frank Bhatiwal and Ayush Verma.
`,

  creative: `
You are LENDA CREATIVE, a creative writing assistant.

YOUR JOB:
- Help with stories, ideas, scripts and brainstorming.
- Adapt to the user's requested tone.
- Be imaginative and original.
- Make creative work clear and engaging.
- Follow the user's requested format.

DEVELOPERS:
Frank Bhatiwal and Ayush Verma.
`,
};

// --------------------------------------------------
// CORS AND REQUEST CONFIGURATION
// --------------------------------------------------

const allowedOrigins = new Set([
  FRONTEND_URL,
  "https://lenda-ai-official.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header are allowed.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked this origin: ${origin}`)
      );
    },
  })
);

app.use(express.json({ limit: "2mb" }));

// --------------------------------------------------
// HEALTH CHECKS
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "LENDA AI",
    message: "The LENDA AI backend is running.",
    model: MODEL,
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    name: "LENDA AI",
    model: MODEL,
    apiConfigured: Boolean(API_KEY),
  });
});

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function getMessageText(message) {
  if (typeof message === "string") {
    return message;
  }

  if (typeof message?.text === "string") {
    return message.text;
  }

  if (typeof message?.content === "string") {
    return message.content;
  }

  if (Array.isArray(message?.parts)) {
    return message.parts
      .map((part) => part?.text || "")
      .join("");
  }

  return "";
}

function getUserPrompt(body) {
  if (typeof body?.message === "string") {
    return body.message.trim();
  }

  if (typeof body?.prompt === "string") {
    return body.prompt.trim();
  }

  if (Array.isArray(body?.messages)) {
    const lastUserMessage = [...body.messages]
      .reverse()
      .find((item) => item?.role === "user");

    return getMessageText(lastUserMessage).trim();
  }

  return "";
}

function isIdentityQuestion(message) {
  return /\b(who\s+(made|built|created|developed)\s+you|who\s+(are|is)\s+your\s+(developer|developers|creator|creators)|who\s+owns\s+you|your\s+(developer|developers|creator|creators))\b/i.test(
    message
  );
}

function getSkill(body) {
  const requestedSkill = String(
    body?.skill || body?.mode || "normal"
  )
    .trim()
    .toLowerCase();

  return SKILLS[requestedSkill] ? requestedSkill : "normal";
}

function getConversationHistory(messages, prompt) {
  if (!Array.isArray(messages)) {
    return [{ role: "user", parts: [{ text: prompt }] }];
  }

  const history = messages
    .filter((message) => {
      return (
        message &&
        ["user", "assistant", "model"].includes(message.role) &&
        getMessageText(message).trim().length > 0
      );
    })
    .slice(-20)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : message.role,
      parts: [{ text: getMessageText(message) }],
    }));

  const lastMessage = history[history.length - 1];

  const alreadyIncluded =
    lastMessage?.role === "user" &&
    lastMessage.parts?.[0]?.text === prompt;

  if (!alreadyIncluded) {
    history.push({
      role: "user",
      parts: [{ text: prompt }],
    });
  }

  return history;
}

// --------------------------------------------------
// CHAT API
// --------------------------------------------------

app.post("/api/chat", async (req, res) => {
  const prompt = getUserPrompt(req.body);

  if (!prompt) {
    return res.status(400).json({
      error: "Please enter a message.",
    });
  }

  if (prompt.length > 20000) {
    return res.status(413).json({
      error: "Your message is too long. Please shorten it.",
    });
  }

  // Answer identity questions without making an API request.
  if (isIdentityQuestion(prompt)) {
    const reply =
      "⚡ My developers are Frank Bhatiwal and Ayush Verma! " +
      "They built LENDA AI together. 🚀";

    return res.json({
      reply,
      text: reply,
      answer: reply,
    });
  }

  if (!ai) {
    return res.status(503).json({
      error:
        "Gemini is not configured. Check the GEMINI_API_KEY environment variable in the backend.",
    });
  }

  const skill = getSkill(req.body);
  const systemInstruction = SKILLS[skill];

  const contents = getConversationHistory(
    req.body?.messages,
    prompt
  );

  // Set up streaming for the frontend.
  res.status(200);
  res.setHeader(
    "Content-Type",
    "text/event-stream; charset=utf-8"
  );
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  let clientDisconnected = false;

  // Monitor the response connection rather than the request body.
  res.on("close", () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
    }
  });

  function sendEvent(data) {
    if (clientDisconnected || res.writableEnded) {
      return false;
    }

    res.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  }

  try {
    const result = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    let fullReply = "";

    for await (const chunk of result) {
      if (clientDisconnected) {
        return;
      }

      const text = chunk.text || "";

      if (!text) {
        continue;
      }

      fullReply += text;

      sendEvent({
        text,
        done: false,
      });
    }

    sendEvent({
      text: "",
      reply: fullReply,
      done: true,
    });

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error) {
    console.error("LENDA Gemini error:", {
      message: error?.message,
      status: error?.status,
    });

    if (!clientDisconnected && !res.writableEnded) {
      const message =
        error?.status === 429
          ? "Gemini rate limit reached. Please wait and try again."
          : "LENDA could not complete the request. Check the Gemini model, API key and backend logs.";

      sendEvent({
        error: message,
        done: true,
      });

      res.end();
    }
  }
});

// --------------------------------------------------
// UNKNOWN API ROUTES
// --------------------------------------------------

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API route not found.",
  });
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error("LENDA server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: "An unexpected backend error occurred.",
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log("-----------------------------------");
  console.log("⚡ LENDA AI backend is running");
  console.log(`📡 Port: ${PORT}`);
  console.log(`🧠 Model: ${MODEL}`);
  console.log(`🔑 API key configured: ${Boolean(API_KEY)}`);
  console.log(`👨‍💻 Developers: ${DEVELOPERS.join(" & ")}`);
  console.log("-----------------------------------");
});