# Server Integration Steps

## New Features to Add to server.js

### 1. Add Imports at Top (After existing imports)

```javascript
// Security & Headers
const securityHeaders = require('./lib/securityHeaders');
const { initializeEmailService } = require('./lib/emailService');
const { initializeRedis } = require('./lib/cache');
const { handleWebhookEvent } = require('./lib/payment');

// New Routes
const { authRoutes, verifyToken, verifyAdmin } = require('./routes/auth');
const { apiKeyRoutes } = require('./routes/apiKeys');
const { approveUser, rejectUser } = require('./lib/approvalWorkflow');
```

### 2. Initialize Services (After Database Connection Test)

```javascript
// Initialize Email Service
initializeEmailService().catch(err => 
  console.warn('⚠️ Email service failed to initialize:', err.message)
);

// Initialize Redis (optional caching)
initializeRedis().catch(err =>
  console.warn('⚠️ Redis caching disabled:', err.message)
);
```

### 3. Add Security Headers Middleware (Right after CORS middleware)

```javascript
// Apply security headers to all responses
app.use(securityHeaders);
```

### 4. Replace Existing Auth Middleware

The existing `auth.authMiddleware` should be updated or replaced with the new `verifyToken` from routes/auth.js for consistency.

### 5. Register New Routes (Before Admin Routes section)

```javascript
// ============================================
// NEW AUTHENTICATION & USER MANAGEMENT ROUTES
// ============================================

// Public auth endpoints (no token required)
app.post('/api/v1/register', async (req, res) => {
  // Route handler from routes/auth.js should be used
  // Can do: app.use('/api/v1', authRoutes);
});

// Protected user endpoints
app.use('/api/v1', apiKeyRoutes);
```

### 6. Add Stripe Webhook Endpoint (Before error handling)

```javascript
// Stripe webhook handling
app.post('/api/v1/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

### 7. Add Swagger/OpenAPI Endpoint (Optional but recommended)

```javascript
// Swagger UI for API documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./openapi.json');

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

## Files That Need Updating

### 1. frontend/src/App.jsx or Router File
Add new routes:
```javascript
import UserRegistration from './pages/UserRegistration';
import UserDashboard from './pages/UserDashboard';
import UserApprovalWorkflow from './components/UserApprovalWorkflow';

// In router:
<Route path="/register" element={<UserRegistration />} />
<Route path="/user-dashboard" element={<UserDashboard />} />
<Route path="/admin/approvals" element={<UserApprovalWorkflow />} />
```

### 2. Database Initialization
Ensure these tables exist:
- api_keys (id, user_id, key, secret, name, created_at, last_used, monthly_requests)
- api_usage (id, user_id, date, requests_count, requests_limit)
- api_logs (id, user_id, api_key_id, endpoint, status, response_time, timestamp)
- audit_logs (id, user_id, action, details, timestamp)
- payments (id, user_id, stripe_invoice_id, amount, status, timestamp)
- state_access (id, user_id, state_id, granted_at)

### 3. Environment Variables
Add to .env:
- All SMTP_ variables
- JWT_SECRET
- STRIPE_* variables
- REDIS_* variables (optional)
- ADMIN_EMAIL

## Testing Checklist Before Deployment

- [ ] API registration endpoint works
- [ ] Login returns valid JWT token
- [ ] API key creation works
- [ ] Rate limiting enforces limits
- [ ] Email service sends registration confirmation
- [ ] Admin approval workflow works
- [ ] Stripe webhooks received
- [ ] Security headers present in responses
- [ ] CORS headers correct
- [ ] All new frontend routes accessible

## Rollout Strategy

1. **Phase 1 (Low Risk)**
   - Add security headers
   - Add email service
   - Test in development

2. **Phase 2 (Medium Risk)**
   - Add authentication routes
   - Add API key routes
   - Test user flows

3. **Phase 3 (Higher Risk)**
   - Add rate limiting enforcement
   - Add Stripe webhooks
   - Test payment flow

4. **Phase 4 (Go Live)**
   - Deploy to production
   - Monitor error logs
   - Test with real payments
