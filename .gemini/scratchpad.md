# Project Scratchpad

## Current Status / Progress Tracking
- [ ] Planning Phase
- [x] Implementation Phase
- [ ] Verification Phase

## Background and Motivation
The user wants to review and improve the existing `asystent-nart-web` application. The app is a ski rental assistant integrating with "FireSnow" software via API and CSV files. It uses a Vite+React+TS frontend and a Node.js/Express backend.

## High-level Task Breakdown
1. **Refactor Backend (`server.js`)**:
   - [x] Split monolithic `server.js` into `routes`, `controllers`, `services`.
   - [x] Move hardcoded configuration to `.env`.
2. **Improve Frontend Code Quality**:
   - [ ] Rename generic components (e.g., `AnimaComponent`).
   - [ ] Ensure proper TypeScript usage.
   - [ ] Extract sub-components (`TabNavigation`, `SkierForm`, `SearchMode`).
3. **DevOps & Tooling**:
   - Add Testing framework (Vitest).
   - Add Docker support.
   - Add proper logging (Winston/Pino).

## Project Status Board
- [x] Initial Code Review
- [x] Create Detailed Plan (`docs/PLAN_ULEPSZEN.md`)
- [x] Refactor Backend
- [ ] Refactor Frontend (Plan Ready)
- [ ] Add Tests

## Executor's Feedback or Assistance Requests
- Backend refactoring completed.
- Frontend plan created: `AnimaComponent` -> `Dashboard` + sub-components.

## Lessons & Decisions
- The project uses a "dual-mode" data fetching strategy (API with CSV fallback), which is critical to maintain.
