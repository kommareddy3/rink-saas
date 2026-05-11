# AI Assistant

The bottom-right of the home page hosts an AI Assistant — a chat bubble
that opens a Groq-backed chat panel. It's available to anyone who lands on
the public site (auth not required).

## What it can answer

The assistant is system-prompted to be useful for:

- Time-series forecasting concepts (LSTM, ARIMA, Prophet, gradient
  boosting, etc.).
- Feature engineering with lag and rolling-window inputs.
- Model evaluation metrics (RMSE, MAE, MAPE, backtesting, walk-forward).
- "How do I do X in RINK?" usage questions.

## What it won't do

- Run queries against your dataset — it doesn't have access to your data.
- Forecast for you — use the workspace.
- Write or execute code that touches your account.

It's an *information* assistant, not an *action* assistant.

## Under the hood

```
Browser ─POST→ /api/ai-assistant ─→ Groq Chat Completions
                                        model=llama-3.3-70b-versatile
                                        temperature=0.7
                                        max_tokens=600
```

- The endpoint requires a non-empty `message` and ≤ 4,000 characters.
- It does **not** require auth — it's gated only by your Groq quota.
- Errors from Groq (rate limits, invalid keys, etc.) are passed through
  with their original status code.

## Configuration

Two env vars on the gateway control the assistant:

| Variable        | Default                       | Notes                                  |
| --------------- | ----------------------------- | -------------------------------------- |
| `GROQ_API_KEY`  | (required)                    | Get one at [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL`    | `llama-3.3-70b-versatile`     | Any chat-capable Groq model            |

Without a key, the endpoint returns `503` and the chat shows *"AI
assistant is not configured on this deployment."*

## Disabling the assistant

To remove it entirely:

1. Don't set `GROQ_API_KEY` — the endpoint returns 503 and the chat
   widget shows an error in place of replies.
2. To hide the widget UI, remove `<AIAssistant />` from `Home.jsx`.
