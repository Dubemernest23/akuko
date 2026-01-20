// routes/auth.js - Authentication routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../Dapbase/dapbase.connection.js');

// Ensure database connection
router.use(async (req, res, next) => {
  try {
    await db.use('akuko');
    next();
  } catch (error) {
    next(error);
  }
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin');
  }
  res.render('auth/login', { title: 'Login' });
});

// Login POST
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/auth/login');
    }

    const { username, password } = req.body;

    // Find user
    const users = await db.select('users', {
      where: { username },
      silent: true
    });

    if (users.length === 0) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/auth/login');
    }

    const user = users[0];

    // Check if user is active
    if (!user.isActive) {
      req.flash('error', 'Your account has been deactivated');
      return res.redirect('/auth/login');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/auth/login');
    }

    // Create session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatar: user.avatar
    };

    req.flash('success', `Welcome back, ${user.displayName}!`);
    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

// Register page
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin');
  }
  res.render('auth/register', { title: 'Register' });
});

// Register POST
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('displayName').trim().notEmpty().withMessage('Display name is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/auth/register');
    }

    const { username, email, displayName, password } = req.body;

    // Check if username exists
    const existingUsers = await db.select('users', {
      where: { username },
      silent: true
    });

    if (existingUsers.length > 0) {
      req.flash('error', 'Username already exists');
      return res.redirect('/auth/register');
    }

    // Check if email exists
    const existingEmails = await db.select('users', {
      where: { email },
      silent: true
    });

    if (existingEmails.length > 0) {
      req.flash('error', 'Email already exists');
      return res.redirect('/auth/register');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.insert('users', {
      username,
      email,
      displayName,
      passwordHash,
      role: 'user', // Regular users can't be admin
      isActive: true
    }, { silent: true });

    // Auto-login
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatar: user.avatar
    };

    req.flash('success', 'Account created successfully!');
    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Change password page
router.get('/change-password', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  res.render('auth/change-password', { title: 'Change Password' });
});

// Change password POST
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/auth/change-password');
    }

    const { currentPassword, newPassword } = req.body;

    // Get user
    const users = await db.select('users', {
      where: { id: req.session.user.id },
      silent: true
    });

    if (users.length === 0) {
      req.flash('error', 'User not found');
      return res.redirect('/auth/logout');
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/auth/change-password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.update('users',
      { passwordHash },
      { id: user.id },
      { silent: true }
    );

    req.flash('success', 'Password changed successfully!');
    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

module.exports = router;