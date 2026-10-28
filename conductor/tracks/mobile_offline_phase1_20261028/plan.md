# Implementation Plan: Surco Móvil Offline y Ejecución en Memoria (Fase 1)

## Phase 1: Client-Side Offline Dispatcher & Engine (TDD)
- [x] Task: Write unit tests for client-side offline dispatcher
  - [x] Create test suite in `src/lib/__tests__/offline-dispatcher.test.ts`
  - [x] Test transparent fallback from network failure to in-memory `respond()`
  - [x] Test form submissions handling in offline mode
- [x] Task: Implement Client-Side Resolution Pipeline
  - [x] Extract and export offline execution resolver in `src/lib/offline-client.ts`
  - [x] Integrate offline resolver with `src/app/chat/page.tsx`
  - [x] Verify seamless fallback when fetch fails or navigator is offline
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Connectivity Indicator & UI Polish (TDD)
- [x] Task: Write tests for Connectivity Hook and Badge
  - [x] Create test suite for `useNetworkStatus` in `src/hooks/__tests__/useNetworkStatus.test.ts`
- [x] Task: Implement Network Status Hook and Header Badge
  - [x] Create `src/hooks/useNetworkStatus.ts` listening to `online`/`offline` events
  - [x] Add connectivity badge to header in `src/app/layout.tsx` or navigation component
  - [x] Style "Modo Campo (Offline)" and "En línea" states with Tailwind CSS
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: PWA Scaffolding & Manifest Configuration
- [x] Task: Web App Manifest & Service Worker Setup
  - [x] Create `public/manifest.json` with Surco agro metadata, theme colors, and icons
  - [x] Create lightweight offline service worker `public/sw.js` for app shell caching
  - [x] Register service worker in `src/app/layout.tsx`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Capacitor Setup for Android
- [x] Task: Install and Initialize Capacitor
  - [x] Install `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android`
  - [x] Create `capacitor.config.ts` configured for Surco (`com.surco.agro`, webDir `out`)
  - [x] Configure Next.js static export script in `package.json` (`build:mobile`)
  - [x] Initialize Android native project via `npx cap add android`
- [x] Task: Verify Android Project Build & Sync
  - [x] Test `npx cap sync android`
  - [x] Verify `android/` directory structure and Gradle configs
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: End-to-End Verification & Documentation
- [ ] Task: Full Test Suite and Verification
  - [ ] Run all Vitest unit tests (`npm test`)
  - [ ] Test Next.js build (`npm run build`)
  - [ ] Verify offline simulation in local browser
- [ ] Task: Documentation Update
  - [ ] Update `README.md` and `tech-stack.md` documenting offline capability, PWA and Android Capacitor commands
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
