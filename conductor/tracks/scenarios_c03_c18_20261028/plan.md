# Implementation Plan: Implementación de Escenarios C03–C18 en Surco

## Phase 1: Foundation & Library Expansion
- [ ] Task: Expand `src/lib/library.ts` with verified sources (R12, R13, R19, R24, R25)
  - [ ] Add R12 (Ley Prov. 10.699) and R13 (Decreto 499/1991)
  - [ ] Add R19 (INTA Sistema de monitoreo remoto de pulverizaciones)
  - [ ] Add R24 (CASAFE Guía de productos fitosanitarios) and R25 (CREA)
- [ ] Task: Update Form Types and API Whitelist
  - [ ] Add new form kinds to `ClarificationFormKind` in `src/lib/types.ts`
  - [ ] Update `FORM_KINDS` whitelist in `src/app/api/chat/route.ts`
- [ ] Task: Phase 1 Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Economic Scenarios (C13, C14, C15)
- [ ] Task: Write failing unit tests for C13, C14, C15
  - [ ] Tests for C13 (Alquileres rurales) query detection, form generation, and form submission
  - [ ] Tests for C14 (Costos de labores FACMA) query detection, form generation, and submission
  - [ ] Tests for C15 (Costos de flete FATRAC) query detection, form generation, and submission
- [ ] Task: Implement C13, C14, C15 in `src/lib/respond.ts`
  - [ ] Detectors `isRentalRatesQuery`, `isLaborCostQuery`, `isFreightCostQuery`
  - [ ] Handlers with clarification forms and honest boundary declarations
  - [ ] Form submission handlers returning grounded next-step actions
  - [ ] Integrate into `respond()` and `handleFormSubmission()`
- [ ] Task: Phase 2 Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Crop Management & Protection Scenarios (C03, C04, C05, C06, C07)
- [ ] Task: Write failing unit tests for C03, C04, C05, C06, C07
  - [ ] Tests for C03 (Malezas problema - REM R08/R09)
  - [ ] Tests for C04 (Plagas y enfermedades)
  - [ ] Tests for C05 (Híbridos y cultivares - R06/R07/R27)
  - [ ] Tests for C06 (Pérdidas de cosecha - R10)
  - [ ] Tests for C07 (Muestreo de suelo review/alignment)
- [ ] Task: Implement C03, C04, C05, C06, C07 in `src/lib/respond.ts`
  - [ ] Implement detectors and insufficient info handlers with interactive forms
  - [ ] Implement form submission handlers with source citations and diagnostic boundaries
  - [ ] Wire up detectors in `respond()` and kinds in `handleFormSubmission()`
- [ ] Task: Phase 3 Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Nutrition & Soil Scenarios (C08, C09)
- [ ] Task: Write failing unit tests for C08 and C09
  - [ ] Tests for C08 (Estrategias y dosis de fertilización - R03/R05)
  - [ ] Tests for C09 (Balance de nutrientes - delimitación clara de lo no implementado vs cálculos urea R03)
- [ ] Task: Implement C08 and C09 in `src/lib/respond.ts`
  - [ ] Implement detectors `isFertilizationStrategyQuery`, `isNutrientBalanceQuery`
  - [ ] Handlers stating non-simulated deterministic boundaries and forms
  - [ ] Form submission handlers in `handleFormSubmission()`
- [ ] Task: Phase 4 Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Weather, Application Conditions & Regulatory Scenarios (C16, C17, C10, C11, C18)
- [ ] Task: Write failing unit tests for C16, C17, C10, C11, C18
  - [ ] Tests for C16 (Heladas - R17/R26 vs R18)
  - [ ] Tests for C17 (Condiciones de aplicación - prohibición de autorización automática, marbetes y R19)
  - [ ] Tests for C10 (Normativa de otros municipios fuera de Tandil)
  - [ ] Tests for C11 (Novedades de insumos sin feeds en tiempo real)
  - [ ] Tests for C18 (Biblioteca propia fuera de alcance MVP)
- [ ] Task: Implement C16, C17, C10, C11, C18 in `src/lib/respond.ts`
  - [ ] Implement detectors and structured handlers
  - [ ] Wire up in `respond()` in strict precedence order to prevent overlaps
- [ ] Task: Phase 5 Verification & Checkpoint (Refer to workflow.md)

## Phase 6: End-to-End Verification, Documentation & Production Deployment
- [ ] Task: Quality Gates and Local Build Verification
  - [ ] Run full test suite (`npm test`), lint (`npm run lint`), build (`npm run build`)
  - [ ] Verify local API server with `curl` for each scenario and form submission
- [ ] Task: Production Deployment & Verification
  - [ ] Deploy prebuilt production build to Vercel (`npx vercel build --prod && npx vercel deploy --prebuilt --prod`)
  - [ ] Verify live endpoints on `https://surco-agro.vercel.app/api/chat` with `curl`
- [ ] Task: Documentation & Changelog Update
  - [ ] Update `README.md` "Qué quedó implementado" section with full C01–C18 breakdown
- [ ] Task: Phase 6 Verification & Checkpoint (Refer to workflow.md)
