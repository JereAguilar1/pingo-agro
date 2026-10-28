# Implementation Plan: Surco Móvil Offline y Ejecución en Memoria (Fase 1)

## Phase 1: Client-Side Offline Dispatcher & Engine (TDD)
- [ ] Task: Write unit tests for client-side offline dispatcher
  - [ ] Create test suite in `src/lib/__tests__/offline-dispatcher.test.ts`
  - [ ] Test transparent fallback from network failure to in-memory `respond()`
  - [ ] Test form submissions handling in offline mode
- [ ] Task: Implement Client-Side Resolution Pipeline
  - [ ] Extract and export offline execution resolver in `src/lib/offline-client.ts`
  - [ ] Integrate offline resolver with `src/app/chat/page.tsx`
  - [ ] Verify seamless fallback when fetch fails or navigator is offline
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Connectivity Indicator & UI Polish (TDD)
- [ ] Task: Write tests for Connectivity Hook and Badge
  - [ ] Create test suite for `useNetworkStatus` in `src/hooks/__tests__/useNetworkStatus.test.ts`
- [ ] Task: Implement Network Status Hook and Header Badge
  - [ ] Create `src/hooks/useNetworkStatus.ts` listening to `online`/`offline` events
  - [ ] Add connectivity badge to header in `src/app/layout.tsx` or navigation component
  - [ ] Style "Modo Campo (Offline)" and "En línea" states with Tailwind CSS
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: PWA Scaffolding & Manifest Configuration
- [ ] Task: Web App Manifest & Service Worker Setup
  - [ ] Create `public/manifest.json` with Surco agro metadata, theme colors, and icons
  - [ ] Create lightweight offline service worker `public/sw.js` for app shell caching
  - [ ] Register service worker in `src/app/layout.tsx`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Capacitor Setup for Android
- [ ] Task: Install and Initialize Capacitor
  - [ ] Install `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android`
  - [ ] Create `capacitor.config.ts` configured for Surco (`com.surco.agro`, webDir `out`)
  - [ ] Configure Next.js static export script in `package.json` (`build:mobile`)
  - [ ] Initialize Android native project via `npx cap add android`
- [ ] Task: Verify Android Project Build & Sync
  - [ ] Test `npx cap sync android`
  - [ ] Verify `android/` directory structure and Gradle configs
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: End-to-End Verification & Documentation
- [ ] Task: Full Test Suite and Verification
  - [ ] Run all Vitest unit tests (`npm test`)
  - [ ] Test Next.js build (`npm run build`)
  - [ ] Verify offline simulation in local browser
- [ ] Task: Documentation Update
  - [ ] Update `README.md` and `tech-stack.md` documenting offline capability, PWA and Android Capacitor commands
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
