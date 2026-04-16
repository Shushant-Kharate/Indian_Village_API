/**
 * Stripe Payment Integration Module
 * Handles subscription plans, billing, and upgrade/downgrade functionality
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('./database');

/**
 * Stripe plans (must be created in Stripe dashboard first, or create programmatically)
 */
const STRIPE_PLANS = {
  free: null, // No Stripe plan for free tier
  premium: process.env.STRIPE_PLAN_PREMIUM || 'plan_premium_monthly',
  pro: process.env.STRIPE_PLAN_PRO || 'plan_pro_monthly',
  unlimited: process.env.STRIPE_PLAN_UNLIMITED || 'plan_unlimited_monthly'
};

/**
 * Plan pricing (in cents)
 */
const PLAN_PRICING = {
  free: 0,
  premium: 4900, // $49.00
  pro: 19900, // $199.00
  unlimited: 49900 // $499.00
};

/**
 * Create a Stripe customer for a user
 */
const createStripeCustomer = async (userId, email, businessName) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name: businessName,
      metadata: {
        userId
      }
    });

    // Store Stripe customer ID in database
    await pool.query(
      'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
      [customer.id, userId]
    );

    return customer;
  } catch (err) {
    console.error('Error creating Stripe customer:', err);
    throw err;
  }
};

/**
 * Get or create Stripe customer
 */
const getOrCreateStripeCustomer = async (userId) => {
  try {
    const userResult = await pool.query(
      'SELECT email, businessName, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    if (user.stripe_customer_id) {
      return await stripe.customers.retrieve(user.stripe_customer_id);
    }

    // Create new customer
    return await createStripeCustomer(userId, user.email, user.businessName);
  } catch (err) {
    console.error('Error getting/creating Stripe customer:', err);
    throw err;
  }
};

/**
 * Create subscription
 */
const createSubscription = async (userId, plan) => {
  try {
    if (plan === 'free') {
      // Downgrade to free - cancel any existing subscription
      const userResult = await pool.query(
        'SELECT stripe_subscription_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows[0]?.stripe_subscription_id) {
        await stripe.subscriptions.cancel(userResult.rows[0].stripe_subscription_id);
      }

      // Update user plan
      await pool.query(
        'UPDATE users SET plan = $1, stripe_subscription_id = NULL, updated_at = NOW() WHERE id = $2',
        [plan, userId]
      );

      return null;
    }

    // Get or create customer
    const customer = await getOrCreateStripeCustomer(userId);

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          plan: STRIPE_PLANS[plan]
        }
      ],
      payment_behavior: 'allow_incomplete',
      metadata: {
        userId,
        plan
      }
    });

    // Update user subscription
    await pool.query(
      'UPDATE users SET plan = $1, stripe_subscription_id = $2, subscription_status = $3, updated_at = NOW() WHERE id = $4',
      [plan, subscription.id, subscription.status, userId]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, timestamp) VALUES ($1, $2, $3, NOW())',
      [userId, 'SUBSCRIPTION_CREATED', `${plan} subscription created - ${subscription.id}`]
    );

    return subscription;
  } catch (err) {
    console.error('Error creating subscription:', err);
    throw err;
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (userId) => {
  try {
    const userResult = await pool.query(
      'SELECT stripe_subscription_id FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.stripe_subscription_id) {
      throw new Error('No active subscription');
    }

    const subscription = await stripe.subscriptions.del(
      userResult.rows[0].stripe_subscription_id
    );

    // Update user
    await pool.query(
      'UPDATE users SET plan = $1, stripe_subscription_id = NULL, subscription_status = $2, updated_at = NOW() WHERE id = $3',
      ['free', 'canceled', userId]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, timestamp) VALUES ($1, $2, $3, NOW())',
      [userId, 'SUBSCRIPTION_CANCELED', `Subscription ${userResult.rows[0].stripe_subscription_id} canceled`]
    );

    return subscription;
  } catch (err) {
    console.error('Error canceling subscription:', err);
    throw err;
  }
};

/**
 * Update subscription plan (upgrade/downgrade)
 */
const updateSubscriptionPlan = async (userId, newPlan) => {
  try {
    const userResult = await pool.query(
      'SELECT stripe_subscription_id, plan FROM users WHERE id = $1',
      [userId]
    );

    const currentSubscriptionId = userResult.rows[0]?.stripe_subscription_id;
    const currentPlan = userResult.rows[0]?.plan;

    if (newPlan === 'free') {
      return await cancelSubscription(userId);
    }

    if (!currentSubscriptionId) {
      // No existing subscription, create new one
      return await createSubscription(userId, newPlan);
    }

    // Get current subscription to find items
    const subscription = await stripe.subscriptions.retrieve(currentSubscriptionId);

    if (subscription.items.data.length === 0) {
      return await createSubscription(userId, newPlan);
    }

    // Update subscription item
    const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          plan: STRIPE_PLANS[newPlan]
        }
      ],
      metadata: {
        userId,
        plan: newPlan
      }
    });

    // Update user
    await pool.query(
      'UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2',
      [newPlan, userId]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, timestamp) VALUES ($1, $2, $3, NOW())',
      [userId, 'PLAN_UPDATED', `Plan upgraded from ${currentPlan} to ${newPlan}`]
    );

    return updatedSubscription;
  } catch (err) {
    console.error('Error updating subscription:', err);
    throw err;
  }
};

/**
 * Handle Stripe webhook events
 */
const handleWebhookEvent = async (event) => {
  try {
    switch (event.type) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Error handling webhook:', err);
  }
};

/**
 * Handle subscription updated
 */
const handleSubscriptionUpdated = async (subscription) => {
  try {
    const userId = subscription.metadata.userId;
    const plan = subscription.metadata.plan;

    await pool.query(
      'UPDATE users SET subscription_status = $1, updated_at = NOW() WHERE id = $2',
      [subscription.status, userId]
    );
  } catch (err) {
    console.error('Error handling subscription update:', err);
  }
};

/**
 * Handle subscription canceled
 */
const handleSubscriptionCanceled = async (subscription) => {
  try {
    const userId = subscription.metadata.userId;

    await pool.query(
      'UPDATE users SET plan = $1, stripe_subscription_id = NULL, subscription_status = $2, updated_at = NOW() WHERE id = $3',
      ['free', 'canceled', userId]
    );
  } catch (err) {
    console.error('Error handling subscription cancellation:', err);
  }
};

/**
 * Handle payment succeeded
 */
const handlePaymentSucceeded = async (invoice) => {
  try {
    const userId = invoice.metadata?.userId;

    if (userId) {
      await pool.query(
        'INSERT INTO payments (user_id, stripe_invoice_id, amount, status, timestamp) VALUES ($1, $2, $3, $4, NOW())',
        [userId, invoice.id, invoice.total, 'succeeded']
      );
    }
  } catch (err) {
    console.error('Error handling payment success:', err);
  }
};

/**
 * Handle payment failed
 */
const handlePaymentFailed = async (invoice) => {
  try {
    const userId = invoice.metadata?.userId;

    if (userId) {
      await pool.query(
        'INSERT INTO payments (user_id, stripe_invoice_id, amount, status, timestamp) VALUES ($1, $2, $3, $4, NOW())',
        [userId, invoice.id, invoice.total, 'failed']
      );

      // Send email notification
      const userResult = await pool.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows[0]) {
        // TODO: Send payment failed email
      }
    }
  } catch (err) {
    console.error('Error handling payment failure:', err);
  }
};

/**
 * Get payment history
 */
const getPaymentHistory = async (userId, limit = 10) => {
  try {
    const result = await pool.query(
      `SELECT id, stripe_invoice_id, amount, status, timestamp 
       FROM payments 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (err) {
    console.error('Error fetching payment history:', err);
    throw err;
  }
};

/**
 * Get billing portal session URL
 */
const getBillingPortalUrl = async (userId, returnUrl) => {
  try {
    const customer = await getOrCreateStripeCustomer(userId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl
    });

    return session.url;
  } catch (err) {
    console.error('Error creating billing portal session:', err);
    throw err;
  }
};

module.exports = {
  createStripeCustomer,
  getOrCreateStripeCustomer,
  createSubscription,
  cancelSubscription,
  updateSubscriptionPlan,
  handleWebhookEvent,
  getPaymentHistory,
  getBillingPortalUrl,
  STRIPE_PLANS,
  PLAN_PRICING
};
