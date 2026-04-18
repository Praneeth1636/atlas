# Atlas

Atlas is an agentic learning tool for the OpenAI x Handshake Codex Creator Challenge.

Live demo: [https://atlas-two-bice.vercel.app](https://atlas-two-bice.vercel.app)

This repository currently contains the Phase 0 deployable baseline and the first round of integration setup:

- Next.js 14 App Router with TypeScript
- Tailwind CSS
- Dark-only placeholder landing page
- Local build verified with `npm run build`
- `octokit`, `openai` (configured for Groq), and `mermaid` installed for the next build steps

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Fill in these required variables:

- `GROQ_API_KEY`
  Create it from [console.groq.com/keys](https://console.groq.com/keys).
- `GROQ_MODEL` (optional)
  Defaults to `llama-3.3-70b-versatile`.
- `GITHUB_TOKEN`
  Create a classic GitHub personal access token with `public_repo` scope.

`.env.local` is already gitignored and should not be committed.

4. Run the development server:

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Status

- Live Vercel deployment is active at [atlas-two-bice.vercel.app](https://atlas-two-bice.vercel.app)
- Homepage placeholder is deployed and auto-deploys from `main`
- Groq, GitHub, and Mermaid dependencies are installed
- `.env.example` is present and local env handling is documented
- End-to-end repo ingestion and lesson generation are not implemented yet
