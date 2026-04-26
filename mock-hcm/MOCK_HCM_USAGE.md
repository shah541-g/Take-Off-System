# Mock HCM Server - Phase 8 Implementation

## Overview
Complete mock HCM server implementation with 7 configurable failure behaviors for testing the Time-Off Microservice.

## Quick Start

### Installation
```bash
cd mock-hcm
npm install --legacy-peer-deps
```

### Development
```bash
npm run start:dev
```

### Production Build
```bash
npm run build
npm run start:prod
```

## Running on Port 3001

The server runs on `http://localhost:3001` and provides:
- **API Base**: `http://localhost:3001/hcm`
- **Swagger Docs**: `http://localhost:3001/docs`

## 7 Configurable Behaviors

### 1. NORMAL
All requests succeed with valid data.
```bash
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior":"NORMAL"}'
```

### 2. TIMEOUT
Response delayed >6 seconds (6.5s).
```bash
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior":"TIMEOUT"}'
```

### 3. PARTIAL_FAILURE
Fails first 3 calls, then succeeds.
```bash
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior":"PARTIAL_FAILURE"}'
```

### 4. DRIFT
Returns different balance each time (simulating independent HCM changes).
```bash
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior":"DRIFT"}'
```

### 5. CIRCUIT_BREAKER
Fails first 5 calls consistently.
```bash
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior":"CIRCUIT_BREAKER"}'
```

### 6. INVALID_DIMENSION
Returns 404 for invalid employee-location-leaveType combinations.
```bash
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior":"INVALID_DIMENSION"}'
```

### 7. INSUFFICIENT_BALANCE
Returns 403 when requesting more than available.
```bash
curl -X POST http://localhost:3001/hcm/admin/set-behavior \
  -H "Content-Type: application/json" \
  -d '{"behavior":"INSUFFICIENT_BALANCE"}'
```

## API Endpoints

### Balance Endpoints

#### Get Single Balance
```bash
GET /hcm/balances/:employeeId/:locationId/:leaveType
```

Example:
```bash
curl http://localhost:3001/hcm/balances/emp001/NYC/PTO
```

Response:
```json
{
  "employeeId": "emp001",
  "locationId": "NYC",
  "leaveType": "PTO",
  "available": 10,
  "used": 0,
  "pending": 0
}
```

#### Batch Sync Balances
```bash
POST /hcm/balances/sync
```

Example:
```bash
curl -X POST http://localhost:3001/hcm/balances/sync \
  -H "Content-Type: application/json" \
  -d '{
    "employees": [
      {"employeeId":"emp001","locationId":"NYC","leaveType":"PTO"},
      {"employeeId":"emp002","locationId":"SF","leaveType":"SICK_LEAVE"}
    ]
  }'
```

#### Get All Employee Balances
```bash
GET /hcm/balances/employee/:employeeId
```

### Time-Off Request Endpoints

#### Submit Request
```bash
POST /hcm/time-off-requests
```

Example:
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

Response:
```json
{
  "hcmRequestId": "uuid-string"
}
```

### Admin Endpoints

#### Set Behavior
```bash
POST /hcm/admin/set-behavior
Body: {"behavior":"TIMEOUT"}
```

#### Reset Behavior
```bash
POST /hcm/admin/reset-behavior
```

#### Get Server State
```bash
GET /hcm/admin/state
```

Response includes current behavior, failure count, drift counter, balances, and recent requests.

#### Manually Update Balance
```bash
POST /hcm/admin/update-balance
Body: {
  "employeeId": "emp001",
  "locationId": "NYC",
  "leaveType": "PTO",
  "available": 15
}
```

#### Reset All Data
```bash
POST /hcm/admin/reset-all
```

#### Health Check
```bash
GET /hcm/admin/health
```

## Seed Data

The server initializes with 10+ employees:

- **emp001**: Sufficient balance (PTO: 10, SICK_LEAVE: 5)
- **emp002**: Low balance (PTO: 1, PERSONAL: 2)
- **emp003**: Zero balance (SICK_LEAVE: 0, PTO: 3)
- **emp004**: Multiple locations
- **emp005**: High balance (PERSONAL: 8, PTO: 12)
- **emp006**: Multiple locations, various balances
- **emp007**: Just used all PTO
- **emp008**: Exactly matching request scenarios
- **emp009**: Edge case testing
- **emp010**: Many pending requests

Locations: NYC, SF, LONDON
Leave Types: PTO, SICK_LEAVE, PERSONAL

## Docker Support

Build and run using Docker:
```bash
docker build -f Dockerfile -t mock-hcm:latest .
docker run -p 3001:3001 mock-hcm:latest
```

## File Structure

```
mock-hcm/
├── src/
│   ├── main.ts                          # Bootstrap
│   ├── app.module.ts                    # Root module
│   ├── common/
│   │   └── exceptions/
│   │       └── index.ts                 # Exception classes
│   ├── controllers/
│   │   ├── balance.controller.ts        # Balance endpoints
│   │   ├── request.controller.ts        # Request endpoints
│   │   └── admin.controller.ts          # Admin endpoints
│   ├── services/
│   │   ├── behavior-engine.service.ts   # 7 behaviors
│   │   ├── balance.service.ts           # Balance management
│   │   └── request.service.ts           # Request management
│   └── fixtures/
│       └── seed-data.ts                 # 10+ employees
├── dist/                                # Compiled output
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript config
├── nest-cli.json                        # NestJS config
├── Dockerfile                           # Container
├── .env.example                         # Environment template
└── .env.local                           # Local development
```

## Development Workflow

1. **Make changes** to `src/` files
2. **Rebuild** with `npm run build`
3. **Test** endpoints with curl or Postman
4. **Check state** with `GET /hcm/admin/state`
5. **Reset** with `POST /hcm/admin/reset-all`

## Error Handling

- **400 Bad Request**: Invalid dimensions or insufficient balance
- **403 Forbidden**: Insufficient balance (INSUFFICIENT_BALANCE behavior)
- **404 Not Found**: Invalid dimension (INVALID_DIMENSION behavior)
- **503 Service Unavailable**: Timeout behavior active

## Testing Integration

The server is designed to be used with:
- Main service integration tests (verify error handling)
- Retry logic tests (validate exponential backoff)
- Circuit breaker tests (test state transitions)
- Drift detection tests (verify independent changes detected)

## Success Criteria ✅

✅ 7 behaviors implemented and tested
✅ 3 controllers with 7+ endpoints
✅ Seed data with 10+ employees
✅ Admin endpoints for behavior control
✅ Swagger documentation auto-generated
✅ TypeScript compilation verified
✅ Docker containerization ready
✅ Runs on port 3001

## Notes

- All times are in UTC
- Balances are stored in-memory (reset on restart)
- Behaviors persist across requests until changed
- Seed data reloads on startup or `POST /hcm/admin/reset-all`
