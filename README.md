# 🏋️‍♂️ TrackBack – Athlete Performance & Feedback Platform

**TrackBack** is a performance tracking and feedback platform designed specifically for coaches and athletes. Built to streamline athlete management, deliver targeted feedback, and leverage AI-powered insights for better training outcomes.

---

## 🚀 Features

- ✅ **Coach Dashboard** – Manage athletes, monitor progress, and provide structured feedback.
- 📈 **Performance History** – Track training and feedback over time.
- 🤖 **AI Insights** – Automatically generate performance highlights and suggestions (Pro & Elite only).
- 📩 **Direct Messaging** – Communicate and log feedback instantly.
- 🧠 **Data-Driven** – Built to support evidence-based coaching.

---

## 💳 Subscription Plans

| Plan    | Athletes | Features | Price (Monthly) |
|---------|----------|----------|------------------|
| Starter | 5        | Basic tools and metrics | €19 |
| Pro     | 20       | Full history, templates, **AI Insights** | €39 |
| Elite   | Unlimited| Reports, branding, priority support | €79 |

> 🏷️ *Annual plans available at ~20% discount.*

---

## ⚙️ Tech Stack

- **Frontend**: Tailwind CSS, React / Next.js
- **Backend**: Supabase (auth, storage, edge functions)
- **AI Services**: Resend, custom analytics pipeline
- **Deployment**: Vercel
- **Domain**: [thetrackback.com](https://thetrackback.com)

---

## 🧪 How to Run Locally

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
