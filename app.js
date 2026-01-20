// app.js - Main blog application
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Adjust as needed
}));
app.use(cors());

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'akuko-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Flash messages
app.use(flash());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global middleware for locals
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentPath = req.path;
  next();
});

// Helper functions available in all views
app.locals.moment = require('moment');
app.locals.formatDate = (date) => {
  return require('moment')(date).format('MMMM D, YYYY');
};
app.locals.timeAgo = (date) => {
  return require('moment')(date).fromNow();
};
app.locals.truncate = (text, length = 150) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Routes
app.use('/', publicRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/404', { 
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('errors/500', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Akuko Blog running on http://localhost:${PORT}`);
  console.log(`📝 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔐 Login: http://localhost:${PORT}/auth/login`);
});

module.exports = app;