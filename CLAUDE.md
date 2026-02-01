# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ski rental assistant web application (Asystent Doboru Nart) - full-stack React/TypeScript frontend with Express.js backend and Java FireSnow Bridge integration. Manages equipment matching, reservations, and rentals for a ski rental business.

## Development Commands

```bash
# Start all services (recommended)
npm run dev:all                    # Linux/Mac
start_jedno_okno.bat              # Windows

# Individual services
npm run dev                        # Frontend (port 5002)
npm run dev:server                 # Backend with watch (port 5001)
cd FireSnowBridge && start-headless.bat  # Java bridge (port 8081)

# Testing
npm test                           # Run all tests
npm run test:ui                    # Interactive test UI
npm run test:coverage              # Coverage report

# Code quality
npm run lint                       # ESLint
npm run format                     # Prettier format
npm run format:check               # Check formatting

# Build
npm run build                      # Build frontend + backend
npm run build:server               # Compile backend only
```

## Architecture

### Three-Tier System
- **Frontend** (React/TypeScript/Vite) - port 5002, proxies `/api` to backend
- **Backend** (Express.js/TypeScript) - port 5001, handles business logic and DB
- **FireSnow Bridge** (Java) - port 8081, read-only HSQLDB connection to external reservation system

### Key Source Locations
```
src/
├── components/
│   ├── dashboard/                 # Main UI - Dashboard.tsx is the orchestrator
│   │   └── hooks/                 # Dashboard-specific hooks (useFormLogic, useSearchLogic, etc.)
│   ├── BrowseSkisComponent.tsx    # Equipment browsing with availability colors
│   └── ui/                        # Reusable UI components
├── services/
│   ├── reservationApiClient.ts    # Availability logic (3-color system)
│   ├── skiDataService.ts          # Equipment data with caching
│   └── skiMatchingServiceV2.ts    # Core matching algorithm (~1,850 lines)
├── server/
│   ├── controllers/               # API route handlers
│   ├── services/                  # Business logic (equipmentService, reservationService, etc.)
│   ├── routes/                    # Express routing
│   └── config/                    # Environment, database, logger setup
└── types/                         # TypeScript definitions

FireSnowBridge/
└── src/FireSnowBridge.java        # Java HTTP server for external DB integration
                                   # Includes DostepnoscOkresHandler for availability queries
```

### Data Flow
1. **FireSnow API** (primary): Equipment, reservations, and rentals from external system via Java bridge
2. **CSV fallback**: `public/data/NOWA_BAZA_KOMPLETNA.csv` - used when FireSnow unavailable
3. **MySQL**: `sprzet_narciarski` (equipment) and `history` (rental history)

### Equipment Availability System (Browse/Przeglądaj)
3-color system for equipment availability in `src/services/reservationApiClient.ts`:

| Color | Status | Condition |
|-------|--------|-----------|
| 🔴 Red | `reserved` | Date conflict with reservation/rental |
| 🟡 Yellow | `warning` | 1-2 days buffer (not enough time for service) |
| 🟢 Green | `available` | 3+ days buffer or no conflicts |

Key constants:
- `SERVICE_BUFFER_DAYS = 2` - minimum days needed for equipment service
- `DEFAULT_RENTAL_DAYS = 30` - default end date for active rentals without return date

### Ski Matching Algorithm (skiMatchingServiceV2.ts)
Two-stage matching with weighted scoring:
- Skill Level: 40%, Weight: 25%, Height: 20%, Gender: 10%, Style: 5%
- Results categorized: idealne, alternatywy, poziom_za_nisko, inna_plec, na_sile

## Environment Setup

Required `.env` variables:
```env
PORT=5001
FIRESNOW_API_URL=http://localhost:8081
USE_FIRESNOW_API=true              # false for CSV-only mode
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<required>
DB_NAME=sprzet_narciarski
DB_HISTORY_NAME=history
```

FireSnow Bridge config in `FireSnowBridge/config.properties`:
```properties
api.port=8081
db.url=jdbc:hsqldb:file:/path/to/FireSport_database_4;readonly=true
```

## API Structure

Main endpoints:
- `/api/skis` - Equipment CRUD (from FireSnow or CSV fallback)
- `/api/reservations` - Reservation management
- `/api/dostepnosc/okres?from={ts}&to={ts}` - Availability check for date range (returns conflicts)
- `/api/wypozyczenia/aktualne|przeszle` - Active/past rentals
- `/api/historia/klienci/wyszukaj` - Client history search
- `/api/firesnow/status` - Bridge health check
- `/api/health` - Server status

### Key Frontend Services
- `src/services/reservationApiClient.ts` - Availability logic, 3-color system
- `src/services/skiDataService.ts` - Equipment data fetching with cache
- `src/services/skiMatchingServiceV2.ts` - Core matching algorithm

## Code Conventions

- TypeScript strict mode enabled
- Named exports preferred
- Component-specific hooks in `components/dashboard/hooks/`
- Global hooks in `src/hooks/`
- Backend types in `src/server/types/`, frontend in `src/types/`
- CSV files use CP1250 encoding (Windows Polish)
- Logging: Winston on backend (`logs/`), client logger on frontend

## Testing

- Framework: Vitest with happy-dom
- Test setup: `src/test/setup.ts`
- Run single test: `npm test -- path/to/test.ts`
