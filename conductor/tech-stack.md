# Technology Stack: Surco

## Core Platform
- **Framework:** Next.js 16.4.3 (App Router, Turbopack)
- **Language:** TypeScript 5.x
- **UI & Styling:** React 19.3.0, Tailwind CSS v4
- **Testing:** Vitest 2.1.9
- **Linting & Code Quality:** ESLint 9 (eslint-config-next)
- **Deployment Platform:** Vercel (Production: `jeremias13/surco-agro`, `https://surco-agro.vercel.app`)

## Architecture & Data
- **Persistence & DB:** None (Stateless MVP). Curated document library versioned in `src/lib/library.ts`.
- **Query Resolution:** Deterministic pattern detection and handler pipeline in `src/lib/respond.ts`.
- **Retrieval Engine:** Keyword-based lexical search in `src/lib/retrieval.ts`.
- **AI Integration:** Server-side optional Anthropic provider (`src/lib/ai-provider.ts`) for RAG synthesis when API key is present; fallback to deterministic demo responses.

## Mobile & Offline Platform
- **Mobile Container:** Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`)
- **PWA Support:** Web App Manifest (`public/manifest.json`) and Cache-first Service Worker (`public/sw.js`)
- **Offline Dispatcher:** Resilient client-side in-memory resolver (`src/lib/offline-client.ts`) and connectivity status hook (`src/hooks/useNetworkStatus.ts`)
