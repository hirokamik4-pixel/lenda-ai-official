import { useEffect, useRef, useState } from "react";
import "./styles.css";

// ======================================================
// LENDA AI — CLOUD CONFIGURATION
// ======================================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://lenda-ai-backend.onrender.com/api/chat"
).replace(/\/+$/, "");

const DEVELOPERS = "Frank Bhatiwal and Ayush Verma";

const MODES = [
  {
    id: "normal",
    label: "Normal",
    icon: "💬",
    title: "LENDA AI",
    subtitle: "YOUR AI. YOUR RULES.",
    greeting: "Yo! I'm LENDA AI. What are we doing today?",
    suggestion: "Explain black holes in simple words",
    accent: "#c084fc",
  },
  {
    id: "funny",
    label: "Funny",
    icon: "😂",
    title: "LENDA FUNNY",
    subtitle: "NO BORING VIBES ALLOWED.",
    greeting: "Oye bhai! 😂 Bol, aaj kya kaand karna hai?",
    suggestion: "Roast me in Hinglish",
    accent: "#fb7185",
  },
  {
    id: "study",
    label: "Study",
    icon: "📚",
    title: "LENDA STUDY",
    subtitle: "LEARN SMARTER.",
    greeting: "Let's make studying less painful and more effective.",
    suggestion: "Explain photosynthesis step by step",
    accent: "#fbbf24",
  },
  {
    id: "coding",
    label: "Coding",
    icon: "💻",
    title: "LENDA CODE",
    subtitle: "BUILD. DEBUG. SHIP.",
    greeting: "Ready to build something awesome?",
    suggestion: "Create a responsive website with React",
    accent: "#34d399",
  },
  {
    id: "research",
    label: "Research",
    icon: "🔎",
    title: "LENDA RESEARCH",
    subtitle: "THINK DEEPER.",
    greeting: "Let's investigate the details and separate facts from guesses.",
    suggestion: "Explain how large language models work",
    accent: "#67e8f9",
  },
  {
    id: "creative",
    label: "Creative",
    icon: "🎨",
    title: "LENDA CREATIVE",
    subtitle: "IMAGINE. CREATE. REPEAT.",
    greeting: "Bring me a wild idea. Let's make something interesting.",
    suggestion: "Give me five futuristic app ideas",
    accent: "#f0abfc",
  },
];

// ======================================================
// HELPERS
// ======================================================

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function makeChat(mode = "normal") {
  const info = MODES.find((item) => item.id === mode) || MODES[0];

  return {
    id: makeId(),
    title: "New chat",
    mode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      {
        id: makeId(),
        role: "assistant",
        content: info.greeting,
      },
    ],
  };
}

function getSavedChats() {
  try {
    const stored = localStorage.getItem("lenda-chats-v2");
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (chat) =>
        chat &&
        typeof chat.id === "string" &&
        Array.isArray(chat.messages)
    );
  } catch {
    return [];
  }
}

function makeTitle(text) {
  const cleaned = text.trim().replace(/\s+/g, " ");

  if (!cleaned) return "New chat";

  return cleaned.length > 35
    ? `${cleaned.slice(0, 35)}…`
    : cleaned;
}

async function copyToClipboard(text) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is unavailable.");
  }

  return navigator.clipboard.writeText(text);
}

// ======================================================
// MESSAGE CONTENT
// ======================================================

function MessageContent({ content }) {
  return (
    <div className="message-content">
      {String(content || "")
        .split("\n")
        .map((line, index) => (
          <div key={`${index}-${line.slice(0, 15)}`}>
            {line || "\u00A0"}
          </div>
        ))}
    </div>
  );
}

function TypingIndicator({ elapsed }) {
  return (
    <div className="thinking-box">
      <div className="typing-indicator" aria-label="LENDA is thinking">
        <span />
        <span />
        <span />
      </div>

      <span className="thinking-label">
        LENDA is thinking
        <span className="thinking-ellipsis">...</span>
      </span>

      <span className="thinking-time">{elapsed}s</span>
    </div>
  );
}

function MessageActions({ message, onCopy, onSpeak }) {
  if (!message.content) return null;

  return (
    <div className="message-actions">
      <button
        type="button"
        onClick={() => onCopy(message.content)}
        title="Copy response"
        aria-label="Copy response"
      >
        📋
      </button>

      <button
        type="button"
        onClick={() => onSpeak(message.content)}
        title="Read response aloud"
        aria-label="Read response aloud"
      >
        🔊
      </button>
    </div>
  );
}

// ======================================================
// MAIN APP
// ======================================================

export default function App() {
  const [chats, setChats] = useState(() => {
    const saved = getSavedChats();
    return saved.length ? saved : [makeChat()];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return getSavedChats()[0]?.id || null;
  });

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Desktop sidebar open; mobile sidebar closed initially.
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 601px)").matches
  );

  const [notice, setNotice] = useState("");

  const abortRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const busyRef = useRef(false);

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) || chats[0];

  const activeMode =
    MODES.find((mode) => mode.id === activeChat?.mode) || MODES[0];

  // Save chat history in this browser.
  useEffect(() => {
    try {
      localStorage.setItem("lenda-chats-v2", JSON.stringify(chats));
    } catch {
      setNotice("Chat history could not be saved in this browser.");
    }
  }, [chats]);

  // Keep the latest message visible.
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeChat?.messages, busy]);

  // Thinking timer.
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }

    const started = Date.now();

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 250);

    return () => clearInterval(timer);
  }, [busy]);

  // Clear notices automatically.
  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(""), 4000);

    return () => clearTimeout(timer);
  }, [notice]);

  // Stop a running request when the app unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function updateChat(chatId, updater) {
    setChats((previous) =>
      previous.map((chat) =>
        chat.id === chatId
          ? { ...updater(chat), updatedAt: Date.now() }
          : chat
      )
    );
  }

  function createNewChat(mode = activeMode.id) {
    if (busyRef.current) {
      setNotice("Wait for LENDA's current reply to finish.");
      return;
    }

    const newChat = makeChat(mode);

    setChats((previous) => [newChat, ...previous]);
    setActiveChatId(newChat.id);
    setInput("");

    // Close the navigation drawer on mobile.
    if (window.matchMedia("(max-width: 600px)").matches) {
      setSidebarOpen(false);
    }

    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function changeMode(mode) {
    if (busyRef.current) {
      setNotice("Wait for the current reply to finish first.");
      return;
    }

    createNewChat(mode);
  }

  function selectChat(chatId) {
    if (busyRef.current) {
      setNotice("Wait for the current reply to finish first.");
      return;
    }

    setActiveChatId(chatId);
    setInput("");

    if (window.matchMedia("(max-width: 600px)").matches) {
      setSidebarOpen(false);
    }
  }

  function deleteChat(chatId) {
    if (busyRef.current) {
      setNotice("Wait for the current reply to finish first.");
      return;
    }

    const remaining = chats.filter((chat) => chat.id !== chatId);

    if (!remaining.length) {
      const newChat = makeChat(activeMode.id);
      setChats([newChat]);
      setActiveChatId(newChat.id);
      return;
    }

    setChats(remaining);

    if (activeChatId === chatId) {
      setActiveChatId(remaining[0].id);
    }
  }

  async function copyText(text) {
    try {
      await copyToClipboard(text);
      setNotice("Copied to clipboard! 📋");
    } catch {
      setNotice("Clipboard access was blocked.");
    }
  }

  function speakText(text) {
    if (!("speechSynthesis" in window)) {
      setNotice("Speech is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  function stopGeneration() {
    abortRef.current?.abort();
    abortRef.current = null;

    busyRef.current = false;
    setBusy(false);
    setNotice("Generation stopped.");
  }

  // ====================================================
  // SEND MESSAGE — STREAM FROM GEMINI BACKEND
  // ====================================================

  async function sendMessage(textOverride) {
    const text = (
      typeof textOverride === "string" ? textOverride : input
    ).trim();

    if (!text || busyRef.current || !activeChat) return;

    const chatId = activeChat.id;
    const mode = activeChat.mode;

    const userMessage = {
      id: makeId(),
      role: "user",
      content: text,
    };

    const assistantMessage = {
      id: makeId(),
      role: "assistant",
      content: "",
    };

    const updatedMessages = [
      ...activeChat.messages,
      userMessage,
      assistantMessage,
    ];

    updateChat(chatId, (chat) => ({
      ...chat,
      title:
        chat.title === "New chat" ? makeTitle(text) : chat.title,
      messages: updatedMessages,
    }));

    setInput("");
    setNotice("");

    busyRef.current = true;
    setBusy(true);
    setElapsed(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
        },
        body: JSON.stringify({
          skill: mode,
          messages: updatedMessages
            .filter((message) => message.content)
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = `Backend returned HTTP ${response.status}.`;

        try {
          const data = await response.json();
          if (data.error) message = data.error;
        } catch {
          // Use the HTTP status message.
        }

        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("The backend returned an empty response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let receivedAnswer = "";

      function updateAssistantContent(content) {
        updateChat(chatId, (chat) => ({
          ...chat,
          messages: chat.messages.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content }
              : message
          ),
        }));
      }

      function processEventBlock(block) {
        const dataLines = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        if (!dataLines.length) return;

        const dataText = dataLines.join("\n");

        let data;

        try {
          data = JSON.parse(dataText);
        } catch {
          return;
        }

        if (data.error) {
          throw new Error(data.details || data.error);
        }

        if (typeof data.token === "string") {
          receivedAnswer += data.token;
          updateAssistantContent(receivedAnswer);
        } else if (typeof data.text === "string") {
          // Also support a backend that emits text instead of token.
          receivedAnswer += data.text;
          updateAssistantContent(receivedAnswer);
        }
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Support both LF and CRLF event separators.
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          processEventBlock(block);
        }
      }

      buffer += decoder.decode();

      if (buffer.trim()) {
        processEventBlock(buffer);
      }

      if (!receivedAnswer.trim()) {
        throw new Error(
          "LENDA returned no text. Check the cloud backend logs and try again."
        );
      }
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("LENDA frontend error:", error);

      let message = error.message || "Something went wrong.";

      if (
        error instanceof TypeError ||
        /failed to fetch|networkerror/i.test(message)
      ) {
        message =
          "Could not connect to LENDA's cloud backend. " +
          "Check your internet connection, the Render service, and its CORS settings.";
      }

      updateChat(chatId, (chat) => ({
        ...chat,
        messages: chat.messages.map((item) =>
          item.id === assistantMessage.id
            ? {
                ...item,
                content: `⚠️ ${message}`,
              }
            : item
        ),
      }));
    } finally {
      busyRef.current = false;
      setBusy(false);
      abortRef.current = null;

      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (!activeChat) {
    return (
      <div className="lenda-app">
        <button type="button" onClick={() => createNewChat("normal")}>
          Start LENDA AI
        </button>
      </div>
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div
      className={`lenda-app mode-${activeMode.id}`}
      style={{ "--accent": activeMode.accent }}
    >
      <div className="ambient-background" />

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${sidebarOpen ? "" : "sidebar-closed"}`}
        aria-label="LENDA navigation"
      >
        <div className="sidebar-brand">
          <div className="brand-symbol">ϟ</div>

          <div>
            <div className="brand-name">LENDA AI</div>
            <div className="brand-version">CLOUD INTELLIGENCE</div>
          </div>
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={() => createNewChat(activeMode.id)}
          disabled={busy}
        >
          <span>＋</span> New chat
        </button>

        <div className="sidebar-section-label">PERSONALITIES</div>

        <div className="mode-list">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`mode-button ${
                activeMode.id === mode.id ? "mode-active" : ""
              }`}
              onClick={() => changeMode(mode.id)}
              disabled={busy}
            >
              <span className="mode-icon">{mode.icon}</span>
              <span>{mode.label}</span>

              {activeMode.id === mode.id && (
                <span className="mode-indicator">●</span>
              )}
            </button>
          ))}
        </div>

        <div className="sidebar-section-label history-heading">
          CHAT HISTORY
        </div>

        <div className="chat-history">
          {chats.map((chat) => {
            const chatMode =
              MODES.find((mode) => mode.id === chat.mode) || MODES[0];

            return (
              <div
                key={chat.id}
                className={`history-item ${
                  activeChatId === chat.id ? "history-active" : ""
                }`}
              >
                <button
                  type="button"
                  className="history-select"
                  onClick={() => selectChat(chat.id)}
                  disabled={busy}
                >
                  <span>{chatMode.icon}</span>
                  <span className="history-title">{chat.title}</span>
                </button>

                <button
                  type="button"
                  className="history-delete"
                  title="Delete chat"
                  aria-label={`Delete ${chat.title}`}
                  onClick={() => deleteChat(chat.id)}
                  disabled={busy}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div className="online-dot" />

          <div>
            <div className="connection-title">CLOUD AI</div>
            <div className="connection-subtitle">Gemini backend</div>
          </div>

          <div className="connection-icon">⚡</div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button menu-button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              ☰
            </button>

            <div className="topbar-mode-icon">{activeMode.icon}</div>

            <div>
              <div className="topbar-title">{activeMode.title}</div>
              <div className="topbar-subtitle">{activeMode.subtitle}</div>
            </div>
          </div>

          <div className="topbar-right">
            <span className="status-indicator" />
            <span className="status-text">CLOUD</span>
          </div>
        </header>

        <section className="conversation">
          {activeChat.messages.length <= 1 ? (
            <div className="welcome-screen">
              <div className="hero-orb">
                <div className="orb-ring orb-ring-one" />
                <div className="orb-ring orb-ring-two" />
                <div className="orb-core">{activeMode.icon}</div>
              </div>

              <div className="hero-eyebrow">PERSONAL AI SYSTEM</div>

              <h1>{activeMode.title}</h1>

              <p className="hero-subtitle">{activeMode.greeting}</p>

              <div className="suggestion-list">
                <button
                  type="button"
                  className="suggestion-card"
                  onClick={() => sendMessage(activeMode.suggestion)}
                  disabled={busy}
                >
                  <span className="suggestion-icon">✨</span>
                  <span>{activeMode.suggestion}</span>
                  <span className="suggestion-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="suggestion-card"
                  onClick={() => sendMessage("Who developed LENDA AI?")}
                  disabled={busy}
                >
                  <span className="suggestion-icon">⚡</span>
                  <span>Meet LENDA's developers</span>
                  <span className="suggestion-arrow">→</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="message-list">
              {activeChat.messages.map((message, index) => {
                const isLatestAssistant =
                  message.role === "assistant" &&
                  index === activeChat.messages.length - 1 &&
                  busy;

                return (
                  <article
                    key={message.id}
                    className={`message-row ${
                      message.role === "user" ? "user-row" : "assistant-row"
                    }`}
                  >
                    <div className="message-avatar">
                      {message.role === "user" ? "👤" : activeMode.icon}
                    </div>

                    <div className="message-body">
                      <div className="message-author">
                        {message.role === "user" ? "YOU" : activeMode.title}
                      </div>

                      {isLatestAssistant && !message.content ? (
                        <TypingIndicator elapsed={elapsed} />
                      ) : (
                        <>
                          <MessageContent content={message.content} />

                          {!busy && message.role === "assistant" && (
                            <MessageActions
                              message={message}
                              onCopy={copyText}
                              onSpeak={speakText}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}

              <div ref={endRef} />
            </div>
          )}
        </section>

        <footer className="composer-area">
          {notice && (
            <div className="notice-message" role="status">
              {notice}
            </div>
          )}

          <div className="composer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeMode.id === "funny"
                  ? "Bol bhai, kya discuss karein? 😂"
                  : "Message LENDA AI..."
              }
              rows={1}
              disabled={busy}
              aria-label="Message LENDA AI"
            />

            {busy ? (
              <button
                type="button"
                className="send-button stop-button"
                onClick={stopGeneration}
                aria-label="Stop generating"
                title="Stop generating"
              >
                ■
              </button>
            ) : (
              <button
                type="button"
                className="send-button"
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                aria-label="Send message"
                title="Send message"
              >
                ↑
              </button>
            )}
          </div>

          <div className="composer-caption">
            <span>⚡ Powered by Gemini</span>
            <span>Enter to send · Shift + Enter for a new line</span>
          </div>
        </footer>

        <div className="developer-credit">
          DEVELOPED BY {DEVELOPERS.toUpperCase()}
        </div>
      </main>
    </div>
  );
}