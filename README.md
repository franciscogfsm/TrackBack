<div align="center">

# TrackBack

Performance tracking and feedback for coaches and athletes.

<img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" alt="React">
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white" alt="Supabase">
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white" alt="Chart.js">
<img src="https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white" alt="OpenAI">
<img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite">

</div>

<br>

**TrackBack** is a performance tracking and feedback platform designed specifically for coaches and athletes. Built to streamline athlete management, deliver targeted feedback, and leverage AI-powered insights for better training outcomes.

---

## Features

- **Coach Dashboard** – Manage athletes, monitor progress, and provide structured feedback.
- **Performance History** – Track training and feedback over time.
- **AI Insights** – Automatically generate performance highlights and suggestions (Pro & Elite only).
- **Direct Messaging** – Communicate and log feedback instantly.
- **Data-Driven** – Built to support evidence-based coaching.

---

## Subscription Plans

| Plan    | Athletes | Features | Price (Monthly) |
|---------|----------|----------|------------------|
| Starter | 5        | Basic tools and metrics | €19 |
| Pro     | 20       | Full history, templates, **AI Insights** | €39 |
| Elite   | Unlimited| Reports, branding, priority support | €79 |

> *Annual plans available at ~20% discount.*

---

## Tech Stack

- **Frontend**: Tailwind CSS, React / Next.js
- **Backend**: Supabase (auth, storage, edge functions)
- **AI Services**: Resend, custom analytics pipeline
- **Deployment**: Vercel
- **Domain**: [thetrackback.com](https://thetrackback.com)

---

## How to Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/trackback.git
cd trackback

# 2. Install dependencies
npm install

# 3. Create an `.env.local` and set your Supabase & Resend keys
cp .env.example .env.local

# 4. Start the dev server
npm run dev
