const { pool } = require('./database');
const { sendApprovalNotification, sendRejectionNotification, sendAdminRegistrationNotification } = require('./emailService');

/**
 * User Approval Workflow Manager
 * Handles the complete approval process for new B2B users
 */

// Get pending users
const getPendingUsers = async () => {
  try {
    const result = await pool.query(
      'SELECT id, email, businessName, gstNumber, address, phone, created_at FROM users WHERE status = $1 ORDER BY created_at ASC',
      ['pending']
    );
    return result.rows;
  } catch (err) {
    console.error('Error fetching pending users:', err);
    throw err;
  }
};

// Get user by status
const getUsersByStatus = async (status, limit = 50, offset = 0) => {
  try {
    const result = await pool.query(
      'SELECT id, email, businessName, plan, status, created_at, requestsThisMonth FROM users WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [status, limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('Error fetching users by status:', err);
    throw err;
  }
};

// Approve a user
const approveUser = async (userId, approvalNotes) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get user details
    const userResult = await client.query(
      'SELECT email, businessName FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const { email, businessName } = userResult.rows[0];

    // Update user status to approved
    await client.query(
      'UPDATE users SET status = $1, updated_at = NOW(), approvalNotes = $2 WHERE id = $3',
      ['approved', approvalNotes || null, userId]
    );

    // Create audit log
    await client.query(
      'INSERT INTO audit_logs (userId, action, details, timestamp) VALUES ($1, $2, $3, NOW())',
      [userId, 'APPROVED', `Approved by admin. Notes: ${approvalNotes || 'None'}`]
    );

    await client.query('COMMIT');

    // Send approval email asynchronously (non-blocking)
    sendApprovalNotification(email, businessName).catch(err => 
      console.error('Failed to send approval email:', err)
    );

    return {
      success: true,
      message: 'User approved successfully',
      userId
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error approving user:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Reject a user
const rejectUser = async (userId, rejectionReason) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get user details
    const userResult = await client.query(
      'SELECT email, businessName FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const { email, businessName } = userResult.rows[0];

    // Update user status to rejected
    await client.query(
      'UPDATE users SET status = $1, updated_at = NOW(), rejectionReason = $2 WHERE id = $3',
      ['rejected', rejectionReason || 'Application does not meet requirements', userId]
    );

    // Create audit log
    await client.query(
      'INSERT INTO audit_logs (userId, action, details, timestamp) VALUES ($1, $2, $3, NOW())',
      [userId, 'REJECTED', `Rejected by admin. Reason: ${rejectionReason}`]
    );

    await client.query('COMMIT');

    // Send rejection email asynchronously (non-blocking)
    sendRejectionNotification(email, businessName, rejectionReason || 'Application does not meet requirements').catch(err => 
      console.error('Failed to send rejection email:', err)
    );

    return {
      success: true,
      message: 'User rejected successfully',
      userId
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error rejecting user:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Upgrade user plan
const upgradeUserPlan = async (userId, newPlan) => {
  try {
    const validPlans = ['free', 'premium', 'pro', 'unlimited'];
    if (!validPlans.includes(newPlan)) {
      throw new Error('Invalid plan');
    }

    const result = await pool.query(
      'UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, plan',
      [newPlan, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Create audit log
    await pool.query(
      'INSERT INTO audit_logs (userId, action, details, timestamp) VALUES ($1, $2, $3, NOW())',
      [userId, 'PLAN_UPGRADED', `Plan upgraded to ${newPlan}`]
    );

    return result.rows[0];
  } catch (err) {
    console.error('Error upgrading user plan:', err);
    throw err;
  }
};

// Send admin notification for new registration
const notifyAdminOfNewRegistration = async (userId, businessName, email, gstNumber) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@villageapi.com';
    await sendAdminRegistrationNotification(adminEmail, businessName, email, gstNumber);
  } catch (err) {
    console.error('Error sending admin notification:', err);
  }
};

// Check if user is approved
const isUserApproved = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT status FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].status === 'approved';
  } catch (err) {
    console.error('Error checking user approval status:', err);
    return false;
  }
};

// Get approval stats
const getApprovalStats = async () => {
  try {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM users
      GROUP BY status
    `);

    const stats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0
    };

    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });

    return stats;
  } catch (err) {
    console.error('Error getting approval stats:', err);
    throw err;
  }
};

module.exports = {
  getPendingUsers,
  getUsersByStatus,
  approveUser,
  rejectUser,
  upgradeUserPlan,
  notifyAdminOfNewRegistration,
  isUserApproved,
  getApprovalStats
};
