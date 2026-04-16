# Village API - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Stripe Configuration](#stripe-configuration)
5. [Email Service Setup](#email-service-setup)
6. [Vercel Deployment](#vercel-deployment)
7. [Custom Domain](#custom-domain)
8. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Vercel account
- Stripe account (for payments)
- Gmail or SMTP provider (for emails)
- Redis (optional, for caching)

## Environment Setup

### 1. Create Production Environment Variables

Copy `.env.example` to `.env.production` and fill in all values:

```bash
cp .env.example .env.production
```

### 2. Required Secrets

Create secure values for:
- `JWT_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `DB_PASSWORD` - Strong PostgreSQL password
- `SMTP_PASSWORD` - App-specific password from email provider
- `STRIPE_SECRET_KEY` - From Stripe dashboard
- `STRIPE_WEBHOOK_SECRET` - From Stripe webhooks

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE indian_villages;
CREATE USER api_user WITH PASSWORD 'your-secure-password';
ALTER ROLE api_user SET client_encoding TO 'utf8';
ALTER ROLE api_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE api_user SET default_transaction_deferrable TO on;
ALTER ROLE api_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE indian_villages TO api_user;

\c indian_villages

# Grant schema privileges
GRANT ALL ON SCHEMA public TO api_user;
```

### 2. Initialize Database Schema

```bash
# Run initialization script
node -e "require('./lib/database').initializeDatabase()"
```

### 3. Load Village Data

The database will be populated from the existing CSV when initialized. Ensure the Dataset/ folder contains the village data.

### 4. Create Indexes

```bash
psql -U api_user -d indian_villages -f scripts/create-indexes.sql
```

## Stripe Configuration

### 1. Create Products and Plans

In Stripe Dashboard, create the following plans:

- **Premium**: $49/month (50,000 requests/day)
- **Pro**: $199/month (300,000 requests/day)
- **Unlimited**: $499/month (unlimited requests)

Note the Plan IDs and set them in `.env.production`:
```
STRIPE_PLAN_PREMIUM=price_xxx
STRIPE_PLAN_PRO=price_yyy
STRIPE_PLAN_UNLIMITED=price_zzz
```

### 2. Setup Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint for: `https://your-domain.vercel.app/api/v1/webhooks/stripe`
3. Subscribe to events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Email Service Setup

### Using Gmail (Recommended)

1. Enable 2-Factor Authentication on Gmail
2. Generate App Password:
   - Go to Google Account → Security
   - Click "App passwords"
   - Select Mail → Windows Computer
   - Copy the generated password
3. Set in `.env.production`:
```
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=generated-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### Using Custom Email Service

Update SMTP credentials for your provider.

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Link Project to Vercel

```bash
vercel link
```

### 3. Set Environment Variables

```bash
# Production
vercel env add DB_HOST
vercel env add DB_USER
vercel env add DB_PASSWORD
vercel env add JWT_SECRET
vercel env add SMTP_USER
vercel env add SMTP_PASSWORD
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
# ... add all other variables
```

Or use `.env.production.local` file:
```bash
vercel env push
```

### 4. Deploy to Production

```bash
# Preview deployment
vercel deploy --prebuilt

# Production deployment
vercel deploy --prod
```

### 5. Verify Deployment

```bash
# Check logs
vercel logs

# Test API
curl https://your-domain.vercel.app/api/v1/health
```

## Custom Domain

### 1. Add Domain to Vercel

1. Go to Vercel Dashboard → Project Settings → Domains
2. Enter your custom domain
3. Follow DNS configuration steps

### 2. Update Email & URLs

In `.env.production`, update:
```
API_URL=https://your-domain.com
DASHBOARD_URL=https://dashboard.your-domain.com
ADMIN_URL=https://admin.your-domain.com
SMTP_FROM=noreply@your-domain.com
```

## Monitoring & Maintenance

### 1. Setup Application Monitoring

Use Vercel Analytics or integrate with:
- Sentry for error tracking
- DataDog for monitoring
- LogRocket for session replay

### 2. Database Backups

```bash
# Daily automated backup (add to cron)
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > backups/db-$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip -c backup.sql.gz | psql -h $DB_HOST -U $DB_USER $DB_NAME
```

### 3. Cache Invalidation

Clear Redis cache during deployment:
```bash
redis-cli FLUSHALL
```

### 4. Monitor Rate Limits

Check API usage:
```bash
psql -U api_user -d indian_villages \
  -c "SELECT COUNT(*) as daily_requests FROM api_logs WHERE timestamp >= NOW() - INTERVAL '1 day';"
```

### 5. Health Checks

Add endpoint monitoring:
```bash
# Every 5 minutes
*/5 * * * * curl https://api.your-domain.com/api/v1/health
```

### 6. Upgrade Database Capacity

For production, consider:
- AWS RDS with read replicas for scaling reads
- Connection pooling via PgBouncer
- Dedicated PostgreSQL instance (not shared hosting)

### 7. Scaling Considerations

- Add CDN (Cloudflare, CloudFront)
- Setup API rate limiting at edge (Vercel Edge Functions)
- Consider Heroku Postgres for PostgreSQL hosting
- Use Redis for session caching

## Troubleshooting

### Issue: 502 Bad Gateway

**Check:**
1. Database connection: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`
2. Environment variables: `vercel env list`
3. Logs: `vercel logs --follow`

### Issue: Slow Queries

**Solution:**
1. Check index usage: `EXPLAIN ANALYZE SELECT ...`
2. Enable query logging
3. Optimize slow queries
4. Consider table partitioning for large tables

### Issue: Email Not Sending

**Check:**
1. SMTP credentials correct
2. Less secure apps not blocked (Gmail)
3. SMTP port correct (usually 587)
4. Logs show email service errors: `grep -i "email" logs/*`

### Issue: Payment Failing

**Check:**
1. Stripe keys configured correctly
2. Webhook endpoint receiving events
3. Database updates after payment
4. Check Stripe dashboard for failed events

## Production Checklist

- [ ] All environment variables configured
- [ ] Database initialized with schema
- [ ] Stripe webhooks configured
- [ ] Email service tested
- [ ] CORS configured for frontend domains
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Admin account created
- [ ] Test payments made
- [ ] User registration tested
- [ ] API documentation deployed

## Rollback Procedure

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy specific commit
vercel deploy --force

# Database rollback (if data corruption)
# 1. Restore from backup
# 2. Stop API
# 3. Restore database
# 4. Restart API
```

## Performance Optimization

1. **Database**: Add indexes, enable query caching
2. **API**: Use Redis for frequently accessed data
3. **Frontend**: Enable gzip compression, optimize images
4. **CDN**: Distribute static assets globally
5. **API Caching**: Set appropriate Cache-Control headers

## Security Hardening

1. Enable HTTPS only (automatic with Vercel)
2. Use strong JWT secret
3. Enable CORS only for trusted domains
4. Rate limiting enabled
5. SQL injection prevention: Use parameterized queries
6. XSS prevention: Sanitize inputs
7. CSRF protection on state-changing endpoints
8. Regular security updates

## Support & Escalation

- API Issues: Check logs with `vercel logs`
- Database Issues: Contact hosting provider
- Payment Issues: Check Stripe dashboard
- Email Issues: Check SMTP provider logs

For additional help, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Stripe API Documentation](https://stripe.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
