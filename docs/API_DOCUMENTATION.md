# Village API - Complete API Documentation

## Base URL
```
Production: https://api.villageapi.com
Development: http://localhost:3000
```

## Authentication

### API Key Authentication (For public endpoints)
Include in request headers:
```
X-API-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X-API-Secret: as_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### JWT Authentication (For user endpoints)
Include in request headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Rate Limiting

Responses include rate limit headers:
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1640000000
```

When limit is exceeded, API returns `429 Too Many Requests`.

## Response Format

All responses follow this format:
```json
{
  "success": true,
  "message": "Request successful",
  "data": {},
  "meta": {
    "apiVersion": "1.0.0",
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_xxx"
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "meta": {
    "apiVersion": "1.0.0",
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_xxx"
  }
}
```

## Endpoints

### Authentication

#### Register New Account
```
POST /api/v1/register
```

Request:
```json
{
  "email": "company@example.com",
  "password": "securepassword",
  "businessName": "Your Company",
  "gstNumber": "27AABCS1234G1Z0",
  "phone": "+91-1234567890",
  "address": "123 Business Street"
}
```

Response (201):
```json
{
  "success": true,
  "message": "Registration successful. Awaiting admin approval.",
  "data": {
    "id": "uuid",
    "email": "company@example.com",
    "businessName": "Your Company",
    "plan": "free",
    "status": "pending"
  }
}
```

#### Login
```
POST /api/v1/login
```

Request:
```json
{
  "email": "company@example.com",
  "password": "securepassword"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "uuid",
    "email": "company@example.com",
    "businessName": "Your Company",
    "plan": "pro"
  }
}
```

### Search Endpoints

#### Search Villages
```
GET /api/v1/search?q=village&state=Maharashtra&limit=10
```

Query Parameters:
- `q` (required): Search query (min 2 characters)
- `state` (optional): Filter by state name
- `district` (optional): Filter by district name
- `limit` (optional): Results limit (1-100, default 10)

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Villagepur",
      "state": "Maharashtra",
      "district": "Pune",
      "subdistrict": "Pune"
    },
    {
      "id": 2,
      "name": "Village Hills",
      "state": "Maharashtra",
      "district": "Nashik",
      "subdistrict": "Nashik"
    }
  ],
  "meta": {
    "total": 250,
    "returned": 2,
    "timestamp": "2024-01-01T12:00:00Z",
    "apiVersion": "1.0.0"
  }
}
```

#### Get All States
```
GET /api/v1/states
```

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Andhra Pradesh",
      "villageCount": 15234
    },
    {
      "id": 2,
      "name": "Arunachal Pradesh",
      "villageCount": 2456
    }
  ],
  "meta": {
    "total": 28,
    "returned": 28,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### Get Districts by State
```
GET /api/v1/districts?state=Maharashtra
```

Query Parameters:
- `state` (required): State name

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Pune",
      "state": "Maharashtra",
      "villageCount": 2150
    },
    {
      "id": 2,
      "name": "Nashik",
      "state": "Maharashtra",
      "villageCount": 1890
    }
  ],
  "meta": {
    "total": 35,
    "returned": 35,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### Get Subdistricts
```
GET /api/v1/subdistricts?state=Maharashtra&district=Pune
```

Query Parameters:
- `state` (required): State name
- `district` (required): District name

Response: Similar structure to districts

### Hierarchy/Autocomplete

#### Get Full Hierarchy
```
GET /api/v1/hierarchy?state=Maharashtra&district=Pune&subdistrict=Pune
```

Response:
```json
{
  "success": true,
  "data": {
    "state": "Maharashtra",
    "stateId": 1,
    "districts": [
      {
        "id": 1,
        "name": "Pune",
        "subdistricts": [
          {
            "id": 1,
            "name": "Pune",
            "villages": [
              {
                "id": 1,
                "name": "Villagepur"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### User Account Endpoints

#### Get Profile
```
GET /api/v1/user/profile
Authorization: Bearer [token]
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "company@example.com",
    "businessName": "Your Company",
    "plan": "pro",
    "status": "approved",
    "phone": "+91-1234567890",
    "address": "123 Business Street",
    "gstNumber": "27AABCS1234G1Z0",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Usage Statistics
```
GET /api/v1/user/usage
Authorization: Bearer [token]
```

Response (200):
```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "requestsUsedToday": 2500,
    "dailyLimit": 300000,
    "burstLimit": 2000,
    "stateAccessCount": 28,
    "maxStateAccess": 28,
    "percentageUsed": 1
  }
}
```

### API Key Management

#### List API Keys
```
GET /api/v1/user/api-keys
Authorization: Bearer [token]
```

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production",
      "key": "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "secret": "••••••••••••••••••••••••••••••••",
      "created_at": "2024-01-01T00:00:00Z",
      "last_used": "2024-01-02T12:00:00Z",
      "monthly_requests": 125000
    }
  ]
}
```

#### Create API Key
```
POST /api/v1/user/api-keys
Authorization: Bearer [token]
Content-Type: application/json

{
  "name": "Staging"
}
```

Response (201):
```json
{
  "success": true,
  "message": "API key created. Save your secret now - it cannot be retrieved later!",
  "data": {
    "id": "uuid",
    "name": "Staging",
    "key": "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "secret": "as_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
  }
}
```

⚠️ **Important**: The secret is only shown once. Store it securely.

#### Delete API Key
```
DELETE /api/v1/user/api-keys/{keyId}
Authorization: Bearer [token]
```

Response (200):
```json
{
  "success": true,
  "message": "API key deleted"
}
```

#### Rotate Secret
```
POST /api/v1/user/api-keys/{keyId}/rotate
Authorization: Bearer [token]
```

Response (200):
```json
{
  "success": true,
  "message": "API secret rotated successfully",
  "data": {
    "id": "uuid",
    "key": "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "secret": "as_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
  }
}
```

#### Get Key Usage
```
GET /api/v1/user/api-keys/{keyId}/usage?days=7
Authorization: Bearer [token]
```

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-02",
      "total_requests": 10500,
      "successful": 10450,
      "errors": 50,
      "avg_response_time": 125
    }
  ],
  "meta": {
    "days": 7,
    "from": "2023-12-26T00:00:00Z"
  }
}
```

### Admin Endpoints

#### List Users (Admin Only)
```
GET /api/v1/admin/users?status=pending&limit=50&offset=0
Authorization: Bearer [admin-token]
```

Query Parameters:
- `status`: pending, approved, rejected
- `limit`: 1-100 (default 50)
- `offset`: Pagination offset

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "company@example.com",
      "businessName": "Your Company",
      "gstNumber": "27AABCS1234G1Z0",
      "phone": "+91-1234567890",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "returned": 50,
    "limit": 50,
    "offset": 0
  }
}
```

#### Approve User (Admin Only)
```
POST /api/v1/admin/users/{userId}/approve
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "notes": "Business verified successfully"
}
```

Response (200):
```json
{
  "success": true,
  "message": "User approved",
  "data": {
    "userId": "uuid"
  }
}
```

#### Reject User (Admin Only)
```
POST /api/v1/admin/users/{userId}/reject
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "reason": "Business details incomplete"
}
```

Response (200):
```json
{
  "success": true,
  "message": "User rejected",
  "data": {
    "userId": "uuid"
  }
}
```

### Analytics Endpoints

#### API Statistics (Admin Only)
```
GET /api/v1/admin/analytics/stats
Authorization: Bearer [admin-token]
```

Response (200):
```json
{
  "success": true,
  "data": {
    "totalRequests": 1250000,
    "totalUsers": 325,
    "approvedUsers": 298,
    "pendingUsers": 15,
    "rejectedUsers": 12,
    "avgResponseTime": 135,
    "p95ResponseTime": 450,
    "p99ResponseTime": 1200,
    "successRate": 98.5
  }
}
```

## Billing & Subscription

### Get Billing Portal
```
POST /api/v1/billing/portal
Authorization: Bearer [token]
Content-Type: application/json

{
  "returnUrl": "https://yourapp.com/settings/billing"
}
```

Response (200):
```json
{
  "success": true,
  "url": "https://billing.stripe.com/..."
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid credentials |
| 403 | Forbidden - Account not approved or insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limits by Plan

| Plan | Daily Limit | Burst Limit | State Access | Cost/Month |
|------|------------|-------------|--------------|-----------|
| Free | 5,000 | 100 req/min | 1 state | Free |
| Premium | 50,000 | 500 req/min | 5 states | $49 |
| Pro | 300,000 | 2,000 req/min | All states | $199 |
| Unlimited | 1,000,000 | 5,000 req/min | All states | $499 |

## Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Search villages
async function searchVillages() {
  try {
    const response = await axios.get('https://api.villageapi.com/api/v1/search', {
      params: {
        q: 'pune',
        state: 'Maharashtra'
      },
      headers: {
        'X-API-Key': 'ak_...',
        'X-API-Secret': 'as_...'
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response?.data);
  }
}
```

### Python
```python
import requests

headers = {
    'X-API-Key': 'ak_...',
    'X-API-Secret': 'as_...'
}

params = {
    'q': 'pune',
    'state': 'Maharashtra',
    'limit': 10
}

response = requests.get(
    'https://api.villageapi.com/api/v1/search',
    params=params,
    headers=headers
)

print(response.json())
```

### cURL
```bash
curl -X GET 'https://api.villageapi.com/api/v1/search?q=pune&state=Maharashtra' \
  -H 'X-API-Key: ak_...' \
  -H 'X-API-Secret: as_...'
```

## Support

- **Documentation**: https://docs.villageapi.com
- **Status Page**: https://status.villageapi.com
- **Email Support**: support@villageapi.com
- **Chat Support**: Available during business hours

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial release
- Search and hierarchy endpoints
- User management
- API key management
- Tiered rate limiting
- Admin dashboard
