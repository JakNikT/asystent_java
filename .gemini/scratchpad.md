# Project Scratchpad

## Current Status / Progress Tracking
- [x] Planning Phase
- [x] Implementation Phase - Backend Refactoring (UKOŃCZONE ✅)
- [x] Implementation Phase - Frontend Cleanup (UKOŃCZONE ✅)
- [x] Implementation Phase - Testing Setup (UKOŃCZONE ✅)
- [x] Debugging Phase - Browse Filter Fix (UKOŃCZONE ✅)
- [ ] Verification Phase
- [ ] Docker/DevOps

## Background and Motivation
The user wants to review and improve the existing `asystent-nart-web` application. The app is a ski rental assistant integrating with "FireSnow" software via API and CSV files. It uses a Vite+React+TS frontend and a Node.js/Express backend.

## High-level Task Breakdown
1. **Refactor Backend (`server.js`)**: ✅ UKOŃCZONE
   - ✅ Split monolithic `server.js` into `routes`, `controllers`, `services`.
   - ✅ Move hardcoded configuration to `.env`.
   - ✅ Created modular structure: `src/server/{config,controllers,routes,services,utils}`
2. **Improve Frontend Code Quality**: ✅ UKOŃCZONE
   - ✅ Created `Dashboard` component (80KB, down from 100KB AnimaComponent)
   - ✅ Extracted subcomponents: `TabNavigation`, `SkierForm`, `EmployeeControls`, etc.
   - ✅ Removed old `AnimaComponent.tsx` (100KB)
   - ✅ Ensure proper TypeScript usage.
3. **Testing Framework**: ✅ UKOŃCZONE
   - ✅ Installed Vitest + testing-library
   - ✅ Created vitest.config.ts
   - ✅ Added test setup file
   - ✅ Created 39 unit tests (all passing ✅)
     - csvParser.test.js (8 tests)
     - formatters.test.js (11 tests)
     - equipmentMapper.test.js (20 tests)
4. **DevOps & Tooling**: ❌ NIE ROZPOCZĘTE
   - ❌ Add Docker support.
   - ❌ Add proper logging (Winston/Pino).

## Project Status Board
- [x] Initial Code Review
- [x] Backend Refactoring Complete
- [x] Frontend Dashboard Created
- [x] Remove old AnimaComponent ✅
- [x] Add Tests ✅
- [x] Fix Browse Filter & Data Loading 🐛
- [ ] Add Docker
- [ ] Production Deployment

## Completed Work Summary

### Bug Fixes (Recent) 🐛
- **Browse View Fix**: Fixed issue where skis were not loading in "Browse" mode.
  - Added missing `useEffect` in `useSkiData.ts` to trigger data fetching on mount.
  - Fixed `csvParser.ts` to handle 17 columns (added `ROK` column support), resolving data corruption issues in fallback mode.
  - Updated `SkiData` type definition to include optional `ROK` field.

### Backend Refactoring ✅
- **Created modular structure** in `src/server/`:
  - `config/` - env.js, database.js
  - `controllers/` - 5 controllers (equipment, firesnow, history, rental, reservation)
  - `routes/` - 6 route files
  - `services/` - 6 service files (csvService, equipmentService, fireSnowService, etc.)
  - `utils/` - 3 utility files
- **Main server.js** reduced to 37 lines (from 1600+)
- **Environment configuration** moved to `.env` file.

### Frontend Improvements ✅
- **Dashboard component** created in `src/components/dashboard/`
- **App.tsx** updated to use Dashboard instead of AnimaComponent
- **Old AnimaComponent.tsx** REMOVED ✅

### Testing Setup ✅
- **Vitest installed** with @vitest/ui, jsdom, happy-dom
- **39 unit tests created** (all passing ✅)

## Executor's Feedback or Assistance Requests
- ✅ Browse filter issue resolved - data loads correctly from API and CSV fallback.
- ✅ `server.js` refactoring completed successfully.
- ❌ No Docker configuration yet.
- 🎯 Branch: `cleanup-and-tests` (or current working branch).

## Lessons & Decisions
- **Frontend Data Loading**: Frontend hooks must explicitly trigger data loading (useEffect) if not managed by a parent component.
- **CSV Robustness**: CSV parsers must be robust to column count changes (added ROK column support).
- The project uses a "dual-mode" data fetching strategy (API with CSV fallback).
