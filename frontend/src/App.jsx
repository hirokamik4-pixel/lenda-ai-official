import { useEffect, useRef, useState } from "react";
import "./styles.css";

// ======================================================
// LENDA AI CONFIGURATION
// ======================================================

const API_URL = "http://127.0.0.1:3001/api/chat";

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
  const modeInfo = MODES.find((item) => item.id === mode) || MODES[0];

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
        content: modeInfo.greeting,
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

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

// ======================================================
// MESSAGE CONTENT
// ======================================================

function MessageContent({ content }) {
  const lines = String(content || "").split("\n");

  return (
    <div className="message-content">
      {lines.map((line, index) => (
        <div key={`${index}-${line.slice(0, 15)}`}>
          {line || "\u00A0"}
        </div>
      ))}
    </div>
  );
}

// ======================================================
// TYPING INDICATOR
// ======================================================

function TypingIndicator({ elapsed }) {
  return (
    <div className="thinking-box">
      <div
        className="typing-indicator"
        aria-label="LENDA is thinking"
      >
        <span />
        <span />
        <span />
      </div>

      <span className="thinking-label">
        LENDA is thinking
        <span className="thinking-ellipsis">...</span>
      </span>

      <span className="thinking-time">
        {elapsed}s
      </span>
    </div>
  );
}

// ======================================================
// MESSAGE ACTIONS
// ======================================================

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
    const saved = getSavedChats();

    return saved[0]?.id || null;
  });

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notice, setNotice] = useState("");

  const abortRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const busyRef = useRef(false);

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) ||
    chats[0];

  const activeMode =
    MODES.find((mode) => mode.id === activeChat?.mode) ||
    MODES[0];

  // ----------------------------------------------------
  // PERSIST HISTORY
  // ----------------------------------------------------

  useEffect(() => {
    try {
      localStorage.setItem(
        "lenda-chats-v2",
        JSON.stringify(chats)
      );
    } catch {
      setNotice("Chat history could not be saved in this browser.");
    }
  }, [chats]);

  // ----------------------------------------------------
  // SCROLL TO LATEST MESSAGE
  // ----------------------------------------------------

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeChat?.messages, busy]);

  // ----------------------------------------------------
  // THINKING TIMER
  // ----------------------------------------------------

  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }

    const started = Date.now();

    const timer = setInterval(() => {
      setElapsed(
        Math.floor((Date.now() - started) / 1000)
      );
    }, 250);

    return () => clearInterval(timer);
  }, [busy]);

  // ----------------------------------------------------
  // NOTICE TIMER
  // ----------------------------------------------------

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [notice]);

  // ----------------------------------------------------
  // CLEANUP STREAM WHEN UNMOUNTING
  // ----------------------------------------------------

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ----------------------------------------------------
  // UPDATE A CHAT
  // ----------------------------------------------------

  function updateChat(chatId, updater) {
    setChats((previous) =>
      previous.map((chat) =>
        chat.id === chatId
          ? {
              ...updater(chat),
              updatedAt: Date.now(),
            }
          : chat
      )
    );
  }

  // ----------------------------------------------------
  // NEW CHAT
  // ----------------------------------------------------

  function createNewChat(mode = activeMode.id) {
    if (busyRef.current) {
      setNotice("Wait for LENDA's current reply to finish.");
      return;
    }

    const newChat = makeChat(mode);

    setChats((previous) => [
      newChat,
      ...previous,
    ]);

    setActiveChatId(newChat.id);
    setInput("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  // ----------------------------------------------------
  // CHANGE MODE
  // ----------------------------------------------------

  function changeMode(mode) {
    if (busyRef.current) {
      setNotice("Wait for the current reply to finish first.");
      return;
    }

    createNewChat(mode);
  }

  // ----------------------------------------------------
  // SELECT CHAT
  // ----------------------------------------------------

  function selectChat(chatId) {
    if (busyRef.current) {
      setNotice("Wait for the current reply to finish first.");
      return;
    }

    setActiveChatId(chatId);
    setInput("");
  }

  // ----------------------------------------------------
  // DELETE CHAT
  // ----------------------------------------------------

  function deleteChat(chatId) {
    if (busyRef.current) {
      setNotice("Wait for the current reply to finish first.");
      return;
    }

    const remaining = chats.filter(
      (chat) => chat.id !== chatId
    );

    if (remaining.length === 0) {
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

  // ----------------------------------------------------
  // COPY
  // ----------------------------------------------------

  async function copyText(text) {
    try {
      await copyToClipboard(text);
      setNotice("Copied to clipboard! 📋");
    } catch {
      setNotice("Clipboard access was blocked.");
    }
  }

  // ----------------------------------------------------
  // TEXT TO SPEECH
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // STOP GENERATION
  // ----------------------------------------------------

  function stopGeneration() {
    abortRef.current?.abort();

    abortRef.current = null;

    busyRef.current = false;
    setBusy(false);
    setNotice("Generation stopped.");
  }

  // ----------------------------------------------------
  // SEND MESSAGE
  // ----------------------------------------------------

  async function sendMessage(textOverride) {
    const text = (
      typeof textOverride === "string"
        ? textOverride
        : input
    ).trim();

    if (!text || busyRef.current || !activeChat) {
      return;
    }

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
        chat.title === "New chat"
          ? makeTitle(text)
          : chat.title,
      messages: updatedMessages,
    }));

    setInput("");

    busyRef.current = true;
    setBusy(true);
    setElapsed(0);
    setNotice("");

    const controller = new AbortController();

    abortRef.current = controller;

    try {
      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          skill: mode,
          messages: updatedMessages
            .filter((message) => message.content)
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
        }),

        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage =
          `Backend returned HTTP ${response.status}.`;

        try {
          const errorData = await response.json();

          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Keep the original error.
        }

        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("The backend did not return a response stream.");
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
              ? {
                  ...message,
                  content,
                }
              : message
          ),
        }));
      }

      function processEventBlock(block) {
        const dataLines = block
          .split("\n")
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
        }
      }

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true,
        });

        const blocks = buffer.split("\n\n");

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
          "LENDA returned no text. Check Ollama and try again."
        );
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error("LENDA frontend error:", error);

      const errorMessage =
        `⚠️ ${error.message || "Something went wrong."}\n\n` +
        "Check that the backend and Ollama are running.";

      updateChat(chatId, (chat) => ({
        ...chat,

        messages: chat.messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: errorMessage,
              }
            : message
        ),
      }));
    } finally {
      busyRef.current = false;
      setBusy(false);
      abortRef.current = null;

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  // ----------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ----------------------------------------------------

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  // ----------------------------------------------------
  // EMPTY FALLBACK
  // ----------------------------------------------------

  if (!activeChat) {
    return (
      <div className="lenda-app">
        <button
          type="button"
          onClick={() => createNewChat("normal")}
        >
          Start LENDA AI
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------

  return (
    <div
      className={`lenda-app mode-${activeMode.id}`}
      style={{
        "--accent": activeMode.accent,
      }}
    >
      <div className="ambient-background" />

      <aside
        className={`sidebar ${sidebarOpen ? "" : "sidebar-closed"}`}
      >
        <div className="sidebar-brand">
          <div className="brand-symbol">ϟ</div>

          <div>
            <div className="brand-name">LENDA AI</div>
            <div className="brand-version">LOCAL INTELLIGENCE</div>
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

        <div className="sidebar-section-label">
          PERSONALITIES
        </div>

        <div className="mode-list">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`mode-button ${
                activeMode.id === mode.id
                  ? "mode-active"
                  : ""
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
              MODES.find((mode) => mode.id === chat.mode) ||
              MODES[0];

            return (
              <div
                key={chat.id}
                className={`history-item ${
                  activeChatId === chat.id
                    ? "history-active"
                    : ""
                }`}
              >
                <button
                  type="button"
                  className="history-select"
                  onClick={() => selectChat(chat.id)}
                  disabled={busy}
                >
                  <span>{chatMode.icon}</span>

                  <span className="history-title">
                    {chat.title}
                  </span>
                </button>

                <button
                  type="button"
                  className="history-delete"
                  title="Delete chat"
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
            <div className="connection-title">
              LOCAL AI
            </div>

            <div className="connection-subtitle">
              Ollama connection
            </div>
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
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>

            <div className="topbar-mode-icon">
              {activeMode.icon}
            </div>

            <div>
              <div className="topbar-title">
                {activeMode.title}
              </div>

              <div className="topbar-subtitle">
                {activeMode.subtitle}
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <span className="status-indicator" />
            <span className="status-text">LOCAL</span>
          </div>
        </header>

        <section className="conversation">
          {activeChat.messages.length <= 1 ? (
            <div className="welcome-screen">
              <div className="hero-orb">
                <div className="orb-ring orb-ring-one" />
                <div className="orb-ring orb-ring-two" />

                <div className="orb-core">
                  {activeMode.icon}
                </div>
              </div>

              <div className="hero-eyebrow">
                PERSONAL AI SYSTEM
              </div>

              <h1>{activeMode.title}</h1>

              <p className="hero-subtitle">
                {activeMode.greeting}
              </p>

              <div className="suggestion-list">
                <button
                  type="button"
                  className="suggestion-card"
                  onClick={() =>
                    sendMessage(activeMode.suggestion)
                  }
                  disabled={busy}
                >
                  <span className="suggestion-icon">
                    ✨
                  </span>

                  <span>
                    {activeMode.suggestion}
                  </span>

                  <span className="suggestion-arrow">
                    →
                  </span>
                </button>

                <button
                  type="button"
                  className="suggestion-card"
                  onClick={() =>
                    sendMessage(
                      "Who developed LENDA AI?"
                    )
                  }
                  disabled={busy}
                >
                  <span className="suggestion-icon">
                    ⚡
                  </span>

                  <span>
                    Meet LENDA's developers
                  </span>

                  <span className="suggestion-arrow">
                    →
                  </span>
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
                      message.role === "user"
                        ? "user-row"
                        : "assistant-row"
                    }`}
                  >
                    <div className="message-avatar">
                      {message.role === "user"
                        ? "👤"
                        : activeMode.icon}
                    </div>

                    <div className="message-body">
                      <div className="message-author">
                        {message.role === "user"
                          ? "YOU"
                          : activeMode.title}
                      </div>

                      {isLatestAssistant &&
                      !message.content ? (
                        <TypingIndicator elapsed={elapsed} />
                      ) : (
                        <>
                          <MessageContent
                            content={message.content}
                          />

                          {!busy &&
                            message.role === "assistant" && (
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
            <div className="notice-message">
              {notice}
            </div>
          )}

          <div className="composer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={
                activeMode.id === "funny"
                  ? "Bol bhai, kya bakchodi discuss karein? 😂"
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
            <span>
              ⚡ Powered by local Ollama
            </span>

            <span>
              Enter to send · Shift + Enter for a new line
            </span>
          </div>
        </footer>

        <div className="developer-credit">
          DEVELOPED BY {DEVELOPERS.toUpperCase()}
        </div>
      </main>
    </div>
  );
}