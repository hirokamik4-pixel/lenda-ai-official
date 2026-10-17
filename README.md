# LENDA AI — Voice Upgrade

This is a separate new-folder version based on your supplied LENDA AI code. It keeps the existing six skills, language selector, dark UI, and the same localStorage chat-history keys.

## Requirements
- Node.js installed
- Ollama installed and running
- Model available: `ollama pull qwen2.5:3b` (only if not already installed)

## Start the backend
Open a terminal in `backend` and run:
```powershell
npm install
npm start
```

## Start the frontend
Open a second terminal in `frontend` and run:
```powershell
npm install
npm run dev
```
Then open the local address printed by Vite (normally `http://127.0.0.1:5173`).

## Voice features
- Click the microphone to dictate. Chrome may ask for microphone permission.
- Click **Read aloud** under an assistant response to hear it. Click **Stop** to stop playback.
- Choose 0.8×, 1×, 1.2×, or 1.5× reading speed.

Speech recognition availability depends on browser support and permission. Read aloud uses the browser's built-in speech synthesis. The backend uses Ollama locally; shorter responses are capped to help limit long waits, but actual generation speed depends on your hardware/model.

## Important
Your existing browser history key is preserved (`lenda-multitasker-chats-v1`). This project copy is separate from your old folders, so you can test it safely before replacing anything.
