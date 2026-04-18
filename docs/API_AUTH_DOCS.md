# 🔐 JWT Authentication & API Key Documentation

## Overview
The API now requires authentication. Users can authenticate using:
1. **JWT Tokens** (short-term, issued after login)
2. **API Keys** (long-term, for automated/server-to-server access)

---

## 📋 Authentication Endpoints

### 1. Register User
**POST** `/auth/register`
- **No authentication required**
- **Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```
- **Response:**
```json
{
  "success": true,
  "count": null,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe"
    },
    "message": "User registered successfully"
  },
  "meta": {
    "responseTime": "2026-04-11T12:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

---

### 2. Login User
**POST** `/auth/login`
- **No authentication required**
- **Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR...",
    "userId": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "message": "Login successful"
  },
  "meta": { ... }
}
```
- **Token expires in:** 7 days

---

### 3. Generate API Key
**POST** `/auth/api-keys`
- **Requires:** JWT Token (Bearer authentication)
- **Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": 1,
      "api_key": "sk_f47a8c9d-1234-5678...",
      "created_at": "2026-04-11T12:00:00Z"
    },
    "message": "API key generated successfully"
  },
  "meta": { ... }
}
```

---

### 4. List API Keys
**GET** `/auth/api-keys`
- **Requires:** JWT Token (Bearer authentication)
- **Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```
- **Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "api_key": "sk_f47a8c9d-1234-5678...",
      "created_at": "2026-04-11T12:00:00Z",
      "last_used": "2026-04-11T13:00:00Z",
      "revoked": false
    },
    {
      "id": 2,
      "api_key": "sk_a1b2c3d4-5678-9012...",
      "created_at": "2026-04-10T10:00:00Z",
      "last_used": null,
      "revoked": true
    }
  ],
  "meta": { ... }
}
```

---

### 5. Revoke API Key
**DELETE** `/auth/api-keys/:keyId`
- **Requires:** JWT Token (Bearer authentication)
- **Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "API key revoked successfully"
  },
  "meta": { ... }
}
```

---

## 🔓 Using Protected Endpoints

All data endpoints now require authentication. Choose one method:

### Method 1: JWT Token (Bearer)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://indian-village-api.vercel.app/api/states
```

### Method 2: API Key
```bash
curl -H "Authorization: sk_your_api_key_here" \
  https://indian-village-api.vercel.app/api/states
```

---

## 📚 Protected Endpoints

These endpoints now require authentication:
- `GET /api/states` - Get all states
- `GET /api/districts/:stateCode` - Get districts
- `GET /api/subdistricts/:districtCode` - Get subdistricts
- `GET /api/villages/:subdistrictCode` - Get villages
- `GET /api/villages/search/:name` - Search villages
- `GET /api/hierarchy/:stateCode/:districtCode/:subdistrictCode` - Get hierarchy
- `GET /api/stats` - Get statistics

---

## 🧪 Example: Complete Flow

### 1. Register
```bash
curl -X POST https://indian-village-api.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "name": "John Doe"
  }'
```

### 2. Login (Get JWT Token)
```bash
curl -X POST https://indian-village-api.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```
**Save the `token` from response**

### 3. Generate API Key (Using JWT Token)
```bash
curl -X POST https://indian-village-api.vercel.app/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Save the `api_key` from response**

### 4. Use API Key to Query Data
```bash
curl https://indian-village-api.vercel.app/api/stats \
  -H "Authorization: YOUR_API_KEY"
```

---

## ⚠️ Error Responses

### 401 Unauthorized (Missing Token)
```json
{
  "success": false,
  "error": "Authorization header missing",
  "meta": { ... }
}
```

### 401 Unauthorized (Invalid Token)
```json
{
  "success": false,
  "error": "Invalid or expired token",
  "meta": { ... }
}
```

### 400 Bad Request (Invalid Credentials)
```json
{
  "success": false,
  "error": "Invalid email or password",
  "meta": { ... }
}
```

---

## 🔒 Security Best Practices

1. **Don't log tokens** - Never print or log tokens in production
2. **Rotate API keys** - Regularly revoke old keys and generate new ones
3. **Use HTTPS** - Always use HTTPS for authentication
4. **Store securely** - Keep tokens in secure storage (browser: localStorage/sessionStorage, server: env vars)
5. **Short expiry** - JWT tokens expire in 7 days; use API keys for long-term access

---

## 📊 User & API Key Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP
);
```

---

## 🚀 Next Steps

- ✅ Authentication implemented
- ⏳ Frontend dashboard (React admin panel)
- ⏳ Rate limiting per API key
- ⏳ Usage analytics & billing
- ⏳ OAuth2 social login

---

**API Base URL:** `https://indian-village-api.vercel.app`  
**API Docs:** This file  
**Support:** Create an issue on GitHub
