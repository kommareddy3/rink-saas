---
layout: home

hero:
  name: RINK Docs
  text: Forecast smarter, faster.
  tagline: Time-series forecasting on your data — upload, train, and predict in one workspace.
  actions:
    - theme: brand
      text: Get started →
      link: /getting-started
    - theme: alt
      text: API reference
      link: /api/
    - theme: alt
      text: Open the app
      link: https://rinkglobal.com

features:
  - icon: 📊
    title: Auto-detected schemas
    details: Date and numeric columns are detected automatically. Reverse-chronological CSVs are sorted to ascending order before training.
  - icon: 🧠
    title: Engineered features
    details: Lag features (1, 2, 3, 5, 7) and rolling means (3, 7) feed a Gradient Boosting model with a held-out validation split.
  - icon: 🔮
    title: Multi-step forecasts
    details: Recursive forecasting up to 200 steps with a confidence band that widens with the horizon.
  - icon: 🔐
    title: Per-user storage
    details: Each user's CSV and model live under their own UUID on the server, and are deleted automatically on sign-out.
  - icon: ⏱
    title: 4-hour idle timeout
    details: Sessions auto-terminate after four hours of inactivity. Activity is tracked across tabs.
  - icon: 🤖
    title: AI assistant included
    details: Ask the in-app assistant about ML, forecasting techniques, or how to use the platform.
---

## What's in here

- **[Getting Started](/getting-started)** — sign up, upload a dataset, generate your first forecast in five minutes.
- **[Architecture](/architecture)** — how the React app, Express gateway, and FastAPI ML service fit together.
- **[Guides](/guides/)** — task-by-task walkthroughs for everything you can do in the workspace.
- **[API Reference](/api/)** — complete request/response docs for every endpoint.
- **[Deployment](/deployment)** — push your own copy to Render + Vercel and onto a custom domain.
- **[FAQ](/faq)** — answers to the questions everyone asks first.

> **New here?** Start with [Getting Started](/getting-started). It will walk you through your first upload, training run, and forecast.
