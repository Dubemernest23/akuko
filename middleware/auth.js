// middleware/auth.js - Authentication middleware

// Check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
      return next();
    }
    req.flash('error', 'Please log in to access this page');
    res.redirect('/auth/login');
  }
  
  // Check if user is admin
  function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
      return next();
    }
    req.flash('error', 'You do not have permission to access this page');
    res.redirect('/');
  }
  
  // Check if user owns the resource or is admin
  function isOwnerOrAdmin(resourceUserId) {
    return (req, res, next) => {
      if (!req.session || !req.session.user) {
        req.flash('error', 'Please log in to access this page');
        return res.redirect('/auth/login');
      }
  
      if (req.session.user.role === 'admin' || req.session.user.id === resourceUserId) {
        return next();
      }
  
      req.flash('error', 'You do not have permission to perform this action');
      res.redirect('/admin');
    };
  }
  
  module.exports = {
    isAuthenticated,
    isAdmin,
    isOwnerOrAdmin
  };