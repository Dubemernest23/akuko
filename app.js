// app.js - Main Akuko Blog application
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
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

// Environment check
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy in production (nginx, Cloudflare, hosting platforms)
if (isProduction) {
  app.set('trust proxy', 1);
}


app.use(cors()); // Optional – remove if no API/cross-origin needed

// Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Body parsing & middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session configuration – use default MemoryStore for now (perfect for dev)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'akuko-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: false,           // false in dev → works on http://localhost
      sameSite: 'lax',
    },
  })
);

// Flash messages (AFTER session!)
app.use(flash());

// View engine & layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layout');

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Pass session/flash to all templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentPath = req.path;
  next();
});

// View helpers
const moment = require('moment');
app.locals.moment = moment;
app.locals.formatDate = (date) => moment(date).format('MMMM D, YYYY');
app.locals.timeAgo = (date) => moment(date).fromNow();
app.locals.truncate = (text, length = 150) =>
  text.length <= length ? text : text.substring(0, length) + '...';

// Routes
app.use('/', publicRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).render('errors/500', {
    title: 'Server Error',
    message: isProduction ? 'Something went wrong!' : err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Akuko Blog running on http://localhost:${PORT}`);
  console.log(`📝 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔐 Login: http://localhost:${PORT}/auth/login`);
});

module.exports = app;