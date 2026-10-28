# Implementation Plan: Motor LLM On-Device Local y RAG Anti-Alucinaciones (Fase 2)

## Phase 1: Local LLM Engine & WebGPU Support Layer (TDD)
- [x] Task: Unit tests for local engine manager and WebGPU detection
  - [x] Create test suite in `src/lib/__tests__/local-llm.test.ts`
  - [x] Test WebGPU availability check and fallback states
  - [x] Test prompt grounding and context formatting
- [x] Task: Implement Local LLM Service (`src/lib/local-llm.ts`)
  - [x] Install `@mlc-ai/web-llm` dependency
  - [x] Implement `initLocalLLM`, `isWebGPUSupported`, and generation runner
  - [x] Implement progress callback handler for model weight download
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: RAG Pipeline Integration & Anti-Hallucination Guardrails
- [x] Task: Integrate local LLM in `src/lib/offline-client.ts`
  - [x] Fallback logic: C01-C18 deterministic -> Local LLM (if loaded) -> library snippet fallback
  - [x] Construct zero-hallucination prompt formatting in `src/lib/prompts.ts`
  - [x] Add post-generation source verification
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: UI Model Manager & Streaming
- [x] Task: Build Model Manager Modal & Progress Bar
  - [x] Create `src/components/ModelManager.tsx` with download button, progress % and delete cache
  - [x] Add Model status button/indicator to the chat header next to `NetworkBadge`
  - [x] Connect streaming tokens to `ChatMessage` in `src/app/chat/page.tsx`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Verification, Build & Deployment
- [~] Task: Full test suite, Next.js build and mobile sync
  - [ ] Run all Vitest unit tests (`npm test`)
  - [ ] Run `npm run build` and `npm run build:mobile`
  - [ ] Deploy update to Vercel production
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
