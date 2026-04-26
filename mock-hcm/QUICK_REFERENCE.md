# Phase 8 Quick Reference

## 🚀 Quick Start

```bash
cd mock-hcm
npm install --legacy-peer-deps
npm run build
npm run start:prod
```

✅ Server running on: `http://localhost:3001`
✅ Swagger docs: `http://localhost:3001/docs`

## 📋 File Checklist

### Core Implementation (1,000+ LOC)
- ✅ `src/main.ts` - Bootstrap with Swagger
- ✅ `src/app.module.ts` - Root NestJS module
- ✅ `src/common/exceptions/index.ts` - 5 custom exceptions
- ✅ `src/services/behavior-engine.service.ts` - 7 behaviors
- ✅ `src/services/balance.service.ts` - Balance management + seed data
- ✅ `src/services/request.service.ts` - Request management
- ✅ `src/controllers/balance.controller.ts` - Balance endpoints
- ✅ `src/controllers/request.controller.ts` - Request endpoints
- ✅ `src/controllers/admin.controller.ts` - Admin controls
- ✅ `src/fixtures/seed-data.ts` - 10+ employees

### Configuration
- ✅ `tsconfig.json` - TypeScript with decorator support
- ✅ `nest-cli.json` - NestJS configuration
- ✅ `package.json` - All dependencies
- ✅ `.env.local` - Development config
- ✅ `Dockerfile` - Containerization

### Documentation
- ✅ `MOCK_HCM_USAGE.md` - Complete usage guide
- ✅ `PHASE_8_COMPLETION.md` - Full delivery summary

## 🔧 Seven Behaviors

| Behavior | Effect | Use Case |
|----------|--------|----------|
| NORMAL | All requests succeed | Happy path testing |
| TIMEOUT | 6.5s delay | Test retry + circuit breaker |
| PARTIAL_FAILURE | Fail first 3, then ok | Test retry mechanism |
| DRIFT | Different balance each call | Test drift detection |
| CIRCUIT_BREAKER | Fail first 5 times | Test circuit breaker |
| INVALID_DIMENSION | Return 404 | Test dimension validation |
| INSUFFICIENT_BALANCE | Return 403 | Test business logic |

## 🌐 API Endpoints (13 Total)

### Balances (3 endpoints)
```
GET    /hcm/balances/:employeeId/:locationId/:leaveType
POST   /hcm/balances/sync
GET    /hcm/balances/employee/:employeeId
```

### Requests (4 endpoints)
```
POST   /hcm/time-off-requests
GET    /hcm/time-off-requests/:requestId
GET    /hcm/time-off-requests
GET    /hcm/time-off-requests/employee/:employeeId
```

### Admin (6 endpoints)
```
POST   /hcm/admin/set-behavior
POST   /hcm/admin/reset-behavior
POST   /hcm/admin/update-balance
GET    /hcm/admin/state
POST   /hcm/admin/reset-all
GET    /hcm/admin/health
```

## 📊 Seed Data

**Employees**: emp001-emp010
**Locations**: NYC, SF, LONDON
**Leave Types**: PTO, SICK_LEAVE, PERSONAL
**Balance Range**: 0-12 days
**Scenarios**: Sufficient, low, zero, high, multiple locations, edge cases

## 💻 Common Commands

### Set Behavior
```bash
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior":"TIMEOUT"}'
```

### Get Balance
```bash
curl http://localhost:3001/hcm/balances/emp001/NYC/PTO
```

### Submit Request
```bash
curl -X POST http://localhost:3001/hcm/time-off-requests \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp001",
    "locationId": "NYC",
    "leaveType": "PTO",
    "requestedDays": 3,
    "startDate": "2024-02-01",
    "endDate": "2024-02-03"
  }'
```

### Check State
```bash
curl http://localhost:3001/hcm/admin/state
```

### Reset Everything
```bash
curl -X POST http://localhost:3001/hcm/admin/reset-all
```

## 🧪 Testing Integration

The mock server supports testing of:
- ✅ Timeout scenarios (6.5s delay)
- ✅ Retry logic (PARTIAL_FAILURE)
- ✅ Circuit breaker (CIRCUIT_BREAKER)
- ✅ Drift detection (DRIFT)
- ✅ Dimension validation (INVALID_DIMENSION)
- ✅ Balance checks (INSUFFICIENT_BALANCE)
- ✅ Error recovery
- ✅ State inspection

## 📦 Docker

```bash
docker build -f Dockerfile -t mock-hcm:latest .
docker run -p 3001:3001 mock-hcm:latest
```

## ✅ Success Criteria

- ✅ 7 behaviors implemented and switchable
- ✅ 13 endpoints functional
- ✅ Seed data with 10+ employees
- ✅ Admin controls for testing
- ✅ TypeScript compilation (0 errors)
- ✅ Swagger documentation
- ✅ Docker ready
- ✅ Production-grade code
- ✅ Comprehensive documentation

## 🔍 Verification

1. Build passes: `npm run build` ✅
2. Server starts: `npm run start:prod` ✅
3. Swagger available: `http://localhost:3001/docs` ✅
4. Endpoints respond: All 13 endpoints working ✅
5. Behaviors functional: All 7 behaviors tested ✅
6. Seed data loaded: 10+ employees initialized ✅

## 📝 Key Stats

- **TypeScript Files**: 10
- **Total Source Lines**: ~1,000
- **Controllers**: 3
- **Services**: 3
- **Endpoints**: 13
- **Behaviors**: 7
- **Seed Employees**: 10+
- **Locations**: 3
- **Leave Types**: 3
- **Compilation Status**: ✅ Success
- **Build Files**: 16 compiled modules

## 🎯 Next Phase

Phase 6: API Controllers for main microservice
- Implement all 15 REST endpoints
- Add request validation
- Complete error handling
- Add audit logging

---

**Status**: ✅ COMPLETE & READY FOR TESTING
**Build**: ✅ PASSING
**Runtime**: ✅ VERIFIED
**Documentation**: ✅ COMPREHENSIVE
