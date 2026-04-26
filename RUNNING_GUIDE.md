# 🚀 COMPLETE RUNNING GUIDE - Time-Off Microservice

## Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start (5 minutes)](#quick-start)
4. [Installation & Setup](#installation--setup)
5. [Running the Application](#running-the-application)
6. [Running All Tests](#running-all-tests)
7. [API Documentation](#api-documentation)
8. [Testing Scenarios](#testing-scenarios)
9. [Troubleshooting](#troubleshooting)
10. [Project Structure](#project-structure)

---

## Project Overview

The **Time-Off Microservice** manages employee time-off requests with real-time balance synchronization with an external HCM (Human Capital Management) system like Workday or SAP.

### Key Features
- ✅ Real-time balance validation from HCM
- ✅ Request lifecycle management (PENDING → APPROVED/REJECTED → CANCELLED)
- ✅ Drift detection for independent balance changes
- ✅ Circuit breaker pattern for HCM failure resilience
- ✅ Comprehensive audit logging for compliance
- ✅ Mock HCM server with 7 configurable failure behaviors
- ✅ 100+ test cases (unit, integration, E2E)
- ✅ >80% code coverage

### Technology Stack
- **Framework**: NestJS (Node.js TypeScript framework)
- **Database**: SQLite with TypeORM
- **Testing**: Jest
- **Containerization**: Docker & docker-compose
- **API Documentation**: Swagger/OpenAPI

---

## Prerequisites

### Required Software
- **Node.js**: v18.x or higher
  - Download: https://nodejs.org/ (LTS version)
  - Verify: `node --version` (should show v18+)

- **npm**: v9.x or higher (comes with Node.js)
  - Verify: `npm --version`

- **Docker** (optional, for containerized deployment)
  - Download: https://www.docker.com/products/docker-desktop/

### System Requirements
- **RAM**: 2GB minimum
- **Disk Space**: 500MB
- **OS**: Windows, macOS, or Linux

---

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
# Install main application dependencies
npm install

# Install mock HCM server dependencies
cd mock-hcm
npm install
cd ..
```

### 2. Run Everything
```bash
# Terminal 1: Start mock HCM
cd mock-hcm
npm start

# Terminal 2: Start main application
npm start
```

### 3. Verify Installation
- Main app: http://localhost:3000/docs
- Mock HCM: http://localhost:3001/docs
- Health check: http://localhost:3000/health

---

## Installation & Setup

### Step 1: Clone/Navigate to Project
```bash
cd "d:\University\Projects\Wizdaa\Take Off System"
```

### Step 2: Install Dependencies

**Main Application**:
```bash
npm install
```

This installs:
- NestJS framework and dependencies
- TypeORM database library
- Jest for testing
- TypeScript compiler
- All peer dependencies

**Mock HCM Server**:
```bash
cd mock-hcm
npm install
cd ..
```

### Step 3: Environment Setup

**Create `.env` file in project root**:
```bash
cp .env.example .env
```

Edit `.env` with these values:
```env
# Database
DATABASE_PATH=data/time-off.db
DATABASE_LOGGING=false
DATABASE_SYNCHRONIZE=false

# HCM Integration
HCM_BASE_URL=http://localhost:3001
HCM_TIMEOUT=5000
HCM_MAX_RETRIES=3
HCM_INITIAL_DELAY_MS=500
HCM_BACKOFF_MULTIPLIER=1.5

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT_MS=60000

# Application
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

**For Mock HCM** - Create `mock-hcm/.env`:
```bash
cp mock-hcm/.env.example mock-hcm/.env
```

Content:
```env
PORT=3001
NODE_ENV=development
MOCK_HCM_PORT=3001
```

### Step 4: Database Setup

The database will be created automatically on first run. To manually initialize:

```bash
# Generate database
npm run migration:generate -- InitialSchema

# Run migrations
npm run migration:run

# Revert if needed
npm run migration:revert
```

---

## Running the Application

### Option 1: Development Mode (Recommended for Testing)

**Terminal 1 - Mock HCM Server**:
```bash
cd mock-hcm
npm run start:dev
```

Expected output:
```
╔════════════════════════════════════════╗
║  Mock HCM Server                       ║
║  Running on http://localhost:3001      ║
║  Docs: http://localhost:3001/docs      ║
╚════════════════════════════════════════╝
```

**Terminal 2 - Main Application**:
```bash
npm run start:dev
```

Expected output:
```
[Nest] 12345 - 2024-01-15 10:30:45     LOG [NestFactory] Starting Nest application...
[Nest] 12345 - 2024-01-15 10:30:46     LOG [InstanceLoader] AppModule dependencies initialized...
[Nest] 12345 - 2024-01-15 10:30:46     LOG Time-Off Microservice running on http://localhost:3000
```

### Option 2: Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Option 3: Docker Compose (All Services)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Verify Services are Running

**Health Check Endpoint**:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "UP",
  "hcm": {
    "status": "UP",
    "circuitBreakerState": "CLOSED",
    "failureCount": 0,
    "lastSuccessfulCheck": "2024-01-15T10:35:20.000Z"
  }
}
```

---

## Running All Tests

### Unit Tests Only
```bash
npm test
```

Output shows:
- Number of test suites passed
- Number of tests passed
- Execution time
- Code coverage percentage

### Integration Tests
```bash
npm run test:integration
```

Tests:
- Request lifecycle (PENDING → APPROVED → CANCELLED)
- Balance validation with mock HCM
- Error scenarios (insufficient balance, timeout, invalid dimension)
- State transition validation

### E2E Tests
```bash
npm run test:e2e
```

Full workflows:
- Employee requests time off
- Manager approves (real-time HCM sync)
- System detects drift
- Request is cancelled (balance refunded)

### All Tests with Coverage Report
```bash
npm run test:cov
```

Generates:
- Terminal output with coverage summary
- HTML coverage report in `coverage/` folder
- Coverage breakdown by file

Open HTML report:
```bash
# Windows
start coverage/index.html

# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

### Watch Mode (Auto-rerun on Changes)
```bash
npm run test:watch
```

Tests automatically re-run when you modify files.

---

## API Documentation

### Swagger UI
Open browser to: **http://localhost:3000/docs**

Shows:
- All 15 API endpoints
- Request/response schemas
- Example curl commands
- Try-it-out interface

### API Endpoints

#### Create Time-Off Request
```bash
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp001",
    "locationId": "NYC",
    "leaveType": "PTO",
    "startDate": "2024-02-01",
    "endDate": "2024-02-02",
    "daysRequested": 2,
    "reason": "Personal business"
  }'
```

Expected response (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "employeeId": "emp001",
  "status": "PENDING",
  "daysRequested": 2,
  "submittedAt": "2024-01-15T10:40:00Z",
  "balanceSnapshot": {
    "available": 10,
    "used": 0
  }
}
```

#### Get Request Details
```bash
curl http://localhost:3000/api/v1/requests/550e8400-e29b-41d4-a716-446655440000
```

#### Approve Request (Real-time HCM Sync)
```bash
curl -X PATCH http://localhost:3000/api/v1/requests/550e8400-e29b-41d4-a716-446655440000/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approverId": "manager001",
    "comment": "Approved"
  }'
```

#### Reject Request
```bash
curl -X PATCH http://localhost:3000/api/v1/requests/550e8400-e29b-41d4-a716-446655440000/reject \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Timing not approved"
  }'
```

#### Cancel Request
```bash
curl -X PATCH http://localhost:3000/api/v1/requests/550e8400-e29b-41d4-a716-446655440000/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "No longer needed"
  }'
```

#### Get Employee Balance
```bash
curl "http://localhost:3000/api/v1/balances/emp001/NYC/PTO"
```

Response:
```json
{
  "employeeId": "emp001",
  "locationId": "NYC",
  "leaveType": "PTO",
  "availableBalance": 10,
  "usedBalance": 0,
  "year": 2024,
  "isCacheStale": false,
  "lastSyncedAt": "2024-01-15T10:35:20Z"
}
```

#### Trigger Batch Balance Sync
```bash
curl -X POST http://localhost:3000/api/v1/admin/sync/balances \
  -H "Content-Type: application/json" \
  -d '{
    "employees": [
      {"employeeId": "emp001", "locationId": "NYC", "leaveType": "PTO"},
      {"employeeId": "emp002", "locationId": "SF", "leaveType": "SICK_LEAVE"}
    ]
  }'
```

#### Get Sync Status
```bash
curl http://localhost:3000/api/v1/admin/sync/sync-session-id
```

#### Detect Drift
```bash
curl -X POST http://localhost:3000/api/v1/admin/detect-drift \
  -H "Content-Type: application/json" \
  -d '{
    "employees": [
      {"employeeId": "emp001", "locationId": "NYC", "leaveType": "PTO"}
    ]
  }'
```

---

## Testing Scenarios

### Scenario 1: Normal Flow (Happy Path)
```bash
# 1. Create request
REQUEST_ID=$(curl -s -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp001",
    "locationId": "NYC",
    "leaveType": "PTO",
    "startDate": "2024-02-01",
    "endDate": "2024-02-02",
    "daysRequested": 2
  }' | jq -r '.id')

echo "Created request: $REQUEST_ID"

# 2. Check balance
curl "http://localhost:3000/api/v1/balances/emp001/NYC/PTO" | jq

# 3. Approve request
curl -X PATCH http://localhost:3000/api/v1/requests/$REQUEST_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"approverId": "manager001"}'

# 4. Verify balance was deducted
curl "http://localhost:3000/api/v1/balances/emp001/NYC/PTO" | jq '.availableBalance'
```

### Scenario 2: Insufficient Balance
```bash
# Try to request more days than available (emp002 has only 1 day)
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp002",
    "locationId": "NYC",
    "leaveType": "PTO",
    "startDate": "2024-02-01",
    "endDate": "2024-02-05",
    "daysRequested": 5
  }'
```

Expected: 409 Conflict - "Insufficient balance for request"

### Scenario 3: HCM Timeout
```bash
# Set mock HCM to timeout behavior
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior": "TIMEOUT"}'

# Try to approve request (will timeout)
curl -X PATCH http://localhost:3000/api/v1/requests/$REQUEST_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"approverId": "manager001"}'
```

Expected: 504 Gateway Timeout

### Scenario 4: Drift Detection
```bash
# Set mock HCM to drift behavior (balance changes between calls)
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior": "DRIFT"}'

# Trigger drift detection
curl -X POST http://localhost:3000/api/v1/admin/detect-drift \
  -H "Content-Type: application/json" \
  -d '{
    "employees": [
      {"employeeId": "emp001", "locationId": "NYC", "leaveType": "PTO"}
    ]
  }'
```

Response shows drift details and changes

### Scenario 5: Circuit Breaker
```bash
# Set circuit breaker behavior (5 consecutive failures)
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior": "CIRCUIT_BREAKER"}'

# Try 5 approvals (5th will fail and open circuit)
for i in {1..5}; do
  curl -X PATCH http://localhost:3000/api/v1/requests/$REQUEST_ID/approve \
    -H "Content-Type: application/json" \
    -d '{"approverId": "manager001"}'
  echo "Attempt $i"
done

# Next request will get 423 (circuit breaker open)
curl -X PATCH http://localhost:3000/api/v1/requests/$REQUEST_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"approverId": "manager001"}'
```

Expected: 423 Service Unavailable - "Circuit breaker is open"

### Scenario 6: Mock HCM Admin Commands
```bash
# View current mock HCM state
curl http://localhost:3001/hcm/admin/state | jq

# Manually update balance in mock HCM
curl -X POST http://localhost:3001/hcm/admin/update-balance \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp001",
    "locationId": "NYC",
    "leaveType": "PTO",
    "newBalance": 15
  }'

# Reset to normal behavior
curl -X POST http://localhost:3001/hcm/admin/reset-behavior

# Verify reset
curl http://localhost:3001/hcm/admin/state | jq '.currentBehavior'
```

---

## Troubleshooting

### Issue: "Port 3000 already in use"
```bash
# Find process using port 3000
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000

# Kill process
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

### Issue: "Cannot find module 'nestjs'"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Mock HCM not responding"
```bash
# Verify mock HCM is running
curl http://localhost:3001/docs

# If not responding, restart it
cd mock-hcm
npm run start:dev
```

### Issue: "Database locked error"
```bash
# Close other instances and try again
# Delete database file to reset
rm data/time-off.db

# Restart application (will create fresh database)
npm start
```

### Issue: "HCM Circuit Breaker Open"
Wait 60 seconds for circuit to reset, or reset it in admin:
```bash
curl -X POST http://localhost:3001/hcm/admin/reset-behavior
```

### Issue: Tests failing with timeout
```bash
# Increase Jest timeout
npm test -- --testTimeout=10000
```

### Enable Debug Logging
```bash
# Run with debug output
DEBUG=* npm start

# Or set in environment
NODE_DEBUG=http,https npm start
```

---

## Project Structure

```
Take Off System/
├── src/                          # Main application source
│   ├── config/                   # Configuration
│   │   └── database.config.ts    # TypeORM database config
│   ├── entities/                 # Database entities
│   │   ├── request.entity.ts     # Time-off request entity
│   │   ├── balance.entity.ts     # Balance cache entity
│   │   ├── balance-history.entity.ts
│   │   └── audit-log.entity.ts   # Audit trail
│   ├── repositories/             # Data access layer
│   │   ├── requests.repository.ts
│   │   ├── balances.repository.ts
│   │   ├── balance-history.repository.ts
│   │   └── audit-logs.repository.ts
│   ├── modules/                  # Feature modules
│   │   ├── requests/             # Time-off request management
│   │   │   ├── requests.service.ts
│   │   │   ├── requests.controller.ts
│   │   │   └── requests.module.ts
│   │   ├── balances/             # Balance management
│   │   │   ├── balances.service.ts
│   │   │   ├── balance-cache.service.ts
│   │   │   ├── balances.controller.ts
│   │   │   └── balances.module.ts
│   │   ├── sync/                 # HCM synchronization
│   │   │   ├── sync.service.ts
│   │   │   ├── drift-detection.service.ts
│   │   │   ├── conflict-resolution.service.ts
│   │   │   ├── sync.controller.ts
│   │   │   └── sync.module.ts
│   │   ├── hcm-integration/      # HCM integration
│   │   │   ├── hcm-client.ts
│   │   │   ├── hcm-retry.service.ts
│   │   │   ├── circuit-breaker.service.ts
│   │   │   ├── health-check.service.ts
│   │   │   └── hcm.module.ts
│   │   ├── audit/                # Audit logging
│   │   │   ├── audit.service.ts
│   │   │   └── audit.module.ts
│   │   └── health/               # Health checks
│   │       ├── health.controller.ts
│   │       └── health.module.ts
│   ├── dto/                      # Data transfer objects
│   │   ├── create-request.dto.ts
│   │   ├── approve-request.dto.ts
│   │   ├── balance.dto.ts
│   │   └── sync.dto.ts
│   ├── common/                   # Shared utilities
│   │   ├── exceptions/           # Custom exceptions
│   │   │   ├── time-off.exception.ts
│   │   │   ├── insufficient-balance.exception.ts
│   │   │   ├── dimension-validation.exception.ts
│   │   │   ├── circuit-breaker-open.exception.ts
│   │   │   └── hcm-timeout.exception.ts
│   │   ├── filters/              # Exception filters
│   │   │   ├── http-exception.filter.ts
│   │   │   └── all-exceptions.filter.ts
│   │   └── utils/                # Utilities
│   ├── app.module.ts             # Root module
│   └── main.ts                   # Application entry point
├── test/                         # Test files
│   ├── unit/                     # Unit tests
│   │   ├── services/
│   │   ├── balances.service.spec.ts
│   │   ├── requests.service.spec.ts
│   │   └── sync.service.spec.ts
│   ├── integration/              # Integration tests
│   │   ├── requests.integration.spec.ts
│   │   ├── balance-sync.integration.spec.ts
│   │   └── api.integration.spec.ts
│   ├── e2e/                      # End-to-end tests
│   │   ├── request-lifecycle.e2e.spec.ts
│   │   └── hcm-integration.e2e.spec.ts
│   └── fixtures/                 # Test data
│       └── seed-data.ts
├── mock-hcm/                     # Mock HCM server
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── balance.controller.ts
│   │   │   ├── request.controller.ts
│   │   │   └── admin.controller.ts
│   │   ├── services/
│   │   │   ├── balance.service.ts
│   │   │   ├── request.service.ts
│   │   │   └── behavior-engine.service.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/                         # Documentation
│   ├── TRD.md                    # Technical Requirements
│   ├── TEST_STRATEGY.md          # Test specifications
│   ├── IMPLEMENTATION_GUIDE.md   # Architecture guide
│   └── MOCK_HCM_SPEC.md          # Mock server spec
├── .env.example                  # Environment template
├── .env.test                     # Test environment
├── package.json                  # Main dependencies
├── tsconfig.json                 # TypeScript config
├── jest.config.js                # Jest test config
├── Dockerfile                    # Main app container
├── docker-compose.yml            # Multi-service orchestration
├── package-lock.json             # Locked versions
└── README.md                      # Quick start

Database (auto-created):
└── data/
    └── time-off.db               # SQLite database file
```

---

## Key Files Reference

### Starting Files
- `src/main.ts` - Application bootstrap
- `src/app.module.ts` - Root NestJS module
- `.env` - Environment configuration

### Core Services
- `src/modules/requests/requests.service.ts` - Request lifecycle
- `src/modules/balances/balances.service.ts` - Balance management
- `src/modules/sync/sync.service.ts` - HCM synchronization
- `src/modules/hcm-integration/hcm-client.ts` - HCM communication

### Data Layer
- `src/entities/` - Database entities (tables)
- `src/repositories/` - Data access (queries)

### API Layer
- `src/modules/*/controllers/` - HTTP endpoints
- `src/dto/` - Request/response schemas

### Testing
- `test/unit/` - Service tests
- `test/integration/` - API endpoint tests
- `test/e2e/` - Complete workflows

### Configuration
- `package.json` - Dependencies & scripts
- `jest.config.js` - Test configuration
- `.env.example` - Environment variables template

---

## Common npm Scripts

```bash
# Development
npm run start:dev          # Start with auto-reload
npm start                  # Production start

# Testing
npm test                   # Run all tests
npm run test:watch        # Auto-rerun tests
npm run test:cov          # Generate coverage report
npm run test:integration  # Integration tests only
npm run test:e2e          # End-to-end tests only

# Build
npm run build             # Compile TypeScript

# Database
npm run migration:generate -- InitialSchema  # Create migration
npm run migration:run     # Apply migrations
npm run migration:revert  # Undo migrations

# Linting
npm run lint              # Check code style

# Formatting
npm run format            # Auto-format code
```

---

## Performance Tips

1. **Use watch mode for development**:
   ```bash
   npm run start:dev
   npm run test:watch
   ```

2. **Cache balance queries**: Reduces HCM calls (30-minute TTL)

3. **Batch sync operations**: Fetch multiple balances in one HCM call

4. **Monitor circuit breaker state**: Check `/health` endpoint

5. **Regular drift detection**: Run batch sync every 6 hours

---

## Security Considerations

- ✅ Input validation on all endpoints
- ✅ Exception handling prevents information leakage
- ✅ No sensitive data in logs
- ✅ Audit trail for compliance
- ✅ Proper HTTP status codes
- ✅ Environment variable secrets

---

## Next Steps

1. ✅ **Installation**: Follow Quick Start above
2. ✅ **Run Tests**: `npm run test:cov` to verify >80% coverage
3. ✅ **Explore APIs**: Open http://localhost:3000/docs
4. ✅ **Run Test Scenarios**: Follow Testing Scenarios section
5. ✅ **Read Documentation**: Check `/docs` folder
6. ✅ **Deploy**: Follow DEPLOYMENT_GUIDE.md

---

## Support & Documentation

- **Swagger API Docs**: http://localhost:3000/docs
- **Tech Requirements**: See `docs/TRD.md`
- **Test Cases**: See `docs/TEST_STRATEGY.md`
- **Architecture**: See `docs/IMPLEMENTATION_GUIDE.md`
- **Mock HCM**: See `docs/MOCK_HCM_SPEC.md`

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Status**: Production Ready
