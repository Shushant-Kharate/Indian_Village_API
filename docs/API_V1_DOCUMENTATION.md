# Indian Village API v1 - Complete Guide

## Overview
The Indian Village API has been **modernized and upgraded** with a complete v1 endpoint structure, improved error handling, rate limiting, logging, and admin dashboard.

---

## 🚀 **Quick Start**

### Install Dependencies
```bash
npm install
```

### Start the Server
```bash
npm start          # Production mode
npm run dev        # Development mode with hot reload
```

The server will start at `http://localhost:3000`

---

## 📍 **API Endpoints Summary**

### **v1 - New Modern API** ✨
All v1 endpoints require authentication (Bearer token or API key)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/states` | GET | Get all 28 states |
| `/api/v1/states/:stateCode/districts` | GET | Get districts in a state |
| `/api/v1/districts/:districtCode/subdistricts` | GET | Get subdistricts in a district |
| `/api/v1/subdistricts/:subdistrictCode/villages` | GET | Get villages in a subdistrict (paginated) |
| `/api/v1/search` | GET | Search/autocomplete across hierarchy |
| `/api/v1/hierarchy` | GET | Get full hierarchical data |
| `/api/v1/stats` | GET | Get dataset statistics |
| `/api/v1/health` | GET | Health check (no auth required) |

### **Authentication Endpoints**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login and get JWT token |
| `/auth/api-keys` | POST | Generate API key |
| `/auth/api-keys` | GET | List user's API keys |
| `/auth/api-keys/:keyId` | DELETE | Revoke API key |

### **Admin Panel** 🔑
Protected by authentication - All endpoints require Bearer token

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/api/stats` | GET | Dashboard statistics |
| `/admin/api/users` | GET | User management |
| `/admin/api/users/:userId` | GET | User details |
| `/admin/api/users/:userId/status` | PATCH | Update user status |
| `/admin/api/users/:userId/plan` | PATCH | Update user plan |
| `/admin/api/villages` | GET | Village browser |
| `/admin/api/logs` | GET | API usage logs |

### **Legacy Endpoints** (For Backward Compatibility)
```
GET /api/states
GET /api/stats
GET /api/health
```

---

## 🔐 **Authentication**

### Method 1: JWT Token (Interactive Sessions)
1. Register: `POST /auth/register`
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

2. Login: `POST /auth/login`
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

3. Use the returned token:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/states
```

### Method 2: API Key (Machine-to-Machine)
1. Generate: `POST /auth/api-keys` (requires JWT)
2. Use in requests:
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:3000/api/v1/states
```

---

## 📊 **Response Format**

All API responses follow a consistent format:

### Success Response (200-299)
```json
{
  "success": true,
  "count": 28,
  "data": [
    { "state_code": "27", "state_name": "Maharashtra", ... }
  ],
  "meta": {
    "requestId": "req_abc123",
    "responseTime": 125,
    "rateLimit": {
      "limit": 1000,
      "remaining": 999,
      "resetAt": "2026-04-11T18:43:08Z"
    }
  }
}
```

### Error Response (400+)
```json
{
  "success": false,
  "error": "Required parameter missing",
  "code": "INVALID_REQUEST",
  "meta": {
    "requestId": "req_xyz789",
    "responseTime": 5
  }
}
```

---

## 🔗 **Example API Calls**

### Get All States
```bash
curl -X GET "http://localhost:3000/api/v1/states" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Districts by State (Maharashtra = 27)
```bash
curl "http://localhost:3000/api/v1/states/27/districts" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Search for Villages
```bash
curl "http://localhost:3000/api/v1/search?q=village&hierarchyLevel=village&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Full Hierarchy (State → Districts → Subdistricts → Villages)
```bash
curl "http://localhost:3000/api/v1/hierarchy?stateCode=27&districtCode=518" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Statistics
```bash
curl "http://localhost:3000/api/v1/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": {
    "states": 28,
    "districts": 459,
    "subdistricts": 4998,
    "villages": 455466
  }
}
```

---

## 📈 **Rate Limiting**

All v1 endpoints are rate-limited to **1,000 requests per hour** per user.

Response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2026-04-11T18:43:08Z
```

When limit exceeded:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "meta": {
    "rateLimit": {
      "limit": 1000,
      "resetTime": "2026-04-11T18:43:08Z"
    }
  }
}
```

---

## 📊 **Pagination**

Endpoints that return large datasets support pagination:

```bash
curl "http://localhost:3000/api/v1/subdistricts/4925/villages?page=2&limit=500"
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 1000, max: 10000)

---

## 🎯 **Search & Autocomplete**

The search endpoint supports searching across different hierarchy levels:

```bash
# Search for states
curl "http://localhost:3000/api/v1/search?q=maharashtra&hierarchyLevel=state"

# Search for districts
curl "http://localhost:3000/api/v1/search?q=pune&hierarchyLevel=district"

# Search for subdistricts
curl "http://localhost:3000/api/v1/search?q=baramati&hierarchyLevel=subdistrict"

# Search for villages (full address)
curl "http://localhost:3000/api/v1/search?q=village&hierarchyLevel=village"
```

Response includes full address hierarchy:
```json
{
  "data": [
    {
      "value": "V123",
      "label": "Village Name",
      "village": "Village Name",
      "subdistrict_name": "Subdistrict",
      "district_name": "District",
      "state_name": "State",
      "fullAddress": "Village Name, Subdistrict, District, State, India"
    }
  ]
}
```

---

## 🏢 **Admin Dashboard**

Access the admin panel with your JWT token:

### Dashboard Stats
```bash
curl "http://localhost:3000/admin/api/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Includes:
- Total states, districts, subdistricts, villages
- Active users, total users
- API requests today
- Average response time
- Estimated MRR

### User Management
```bash
# List all users
curl "http://localhost:3000/admin/api/users?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get user details
curl "http://localhost:3000/admin/api/users/123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update user status
curl -X PATCH "http://localhost:3000/admin/api/users/123/status" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active", "reason": "Approved"}'

# Update user plan
curl -X PATCH "http://localhost:3000/admin/api/users/123/plan" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "premium"}'
```

### Village Browser
```bash
curl "http://localhost:3000/admin/api/villages?state=27&district=518&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### API Logs
```bash
curl "http://localhost:3000/admin/api/logs?startDate=2026-04-10&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 **Error Codes**

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_REQUEST` | 400 | Missing/invalid parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `QUERY_ERROR` | 500 | Database query failed |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 🔄 **Logging & Analytics**

All API requests are automatically logged:
- Endpoint, method, status
- Response time
- User ID / API Key (masked)
- IP address, User-Agent
- Timestamp

Access logs via `/admin/api/logs`

---

## 📚 **Database Structure**

```
STATES
├── state_code (PK)
└── state_name

DISTRICTS  
├── district_code (PK)
├── state_code (FK)
└── district_name

SUBDISTRICTS
├── subdistrict_code (PK)
├── district_code (FK)
└── subdistrict_name

VILLAGES
├── village_code (PK)
├── subdistrict_code (FK)
└── village_name

USERS
├── id (PK)
├── email (UNIQUE)
├── password (hashed)
└── plan, status, created_at

API_KEYS
├── id (PK)
├── user_id (FK)
├── key_hash
└── created_at, expires_at

API_LOGS
├── id (PK)
├── request_id
├── user_id
├── endpoint
└── response_time, status_code, created_at
```

---

## 🚀 **Deploy to Production**

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key-change-in-production
PORT=3000
NODE_ENV=production
```

### Vercel Deployment
```bash
npm install -g vercel
vercel login
vercel deploy
```

The server exports as a modular app for serverless deployment.

---

## 📝 **Testing**

Run the comprehensive test suite:
```bash
node test-v1-api.js
```

This tests:
- User registration & login
- API key generation
- All v1 endpoints
- Response format validation
- Rate limiting
- Backwards compatibility

---

## 🤝 **Support**

For issues or feature requests, visit:
- GitHub: https://github.com/Shushant-Kharate/Indian_Village_API
- Email: [your-contact@example.com]

---

## 📄 **License**

ISC License - See `LICENSE` file for details

---

**API Version:** v1 (Modernized)
**Last Updated:** April 11, 2026
**Database Records:** 455,466 villages across 28 states
