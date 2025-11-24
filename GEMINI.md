# Project Scratchpad

## Current Status / Progress Tracking
- [x] Planning Phase
- [ ] Implementation Phase
- [ ] Verification Phase

## Background and Motivation
The user wants to review and improve the existing `asystent-nart-web` application. The app is a ski rental assistant integrating with "FireSnow" software via API and CSV files. It uses a Vite+React+TS frontend and a Node.js/Express backend.

## High-level Task Breakdown
1. **Refactor Backend (`server.js`)**:
   - Split monolithic `server.js` into `routes`, `controllers`, `services`.
   - Move hardcoded configuration to `.env`.
2. **Improve Frontend Code Quality**:
   - Rename generic components (e.g., `AnimaComponent`).
   - Ensure proper TypeScript usage.
3. **DevOps & Tooling**:
   - Add Testing framework (Vitest).
   - Add Docker support.
   - Add proper logging (Winston/Pino).

## Project Status Board
- [x] Initial Code Review
- [ ] Propose improvements to User

## Executor's Feedback or Assistance Requests
- `server.js` is large (1600+ lines) and handles mixed concerns. It requires careful refactoring to avoid breaking the dual API/CSV logic.
- `App.tsx` is minimal, delegating everything to `AnimaComponent`. Need to investigate `AnimaComponent` to understand the UI structure better.

## Lessons & Decisions
- The project uses a "dual-mode" data fetching strategy (API with CSV fallback), which is critical to maintain.