// routes/admin.js - Admin panel routes
const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const { body, validationResult } = require('express-validator');
const db = require('../Dapbase/dapbase.connection.js');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { upload, deleteFile } = require('../middleware/upload');

// Apply authentication to all admin routes
router.use(isAuthenticated);

// Ensure database connection
router.use(async (req, res, next) => {
  try {
    await db.use('akuko');
    next();
  } catch (error) {
    next(error);
  }
});

// Dashboard
router.get('/', async (req, res, next) => {
  try {
    // Get statistics
    const allPosts = await db.select('posts', { silent: true });
    const publishedPosts = allPosts.filter(p => p.status === 'published');
    const draftPosts = allPosts.filter(p => p.status === 'draft');
    
    const allComments = await db.select('comments', { silent: true });
    const pendingComments = allComments.filter(c => !c.isApproved);
    
    const categories = await db.select('categories', { silent: true });

    // Get recent posts
    const recentPosts = await db.select('posts', {
      join: [{
        table: 'users',
        on: { local: 'authorId', foreign: 'id' },
        as: 'author',
        type: 'left'
      }],
      orderBy: ['createdAt', 'desc'],
      limit: 5,
      silent: true
    });

    // Get recent comments
    const recentComments = await db.select('comments', {
      join: [{
        table: 'posts',
        on: { local: 'postId', foreign: 'id' },
        as: 'post',
        type: 'left'
      }],
      orderBy: ['createdAt', 'desc'],
      limit: 5,
      silent: true
    });

    res.render('admin/dashboard', {
      title: 'Dashboard',
      stats: {
        totalPosts: allPosts.length,
        publishedPosts: publishedPosts.length,
        draftPosts: draftPosts.length,
        totalComments: allComments.length,
        pendingComments: pendingComments.length,
        categories: categories.length
      },
      recentPosts,
      recentComments
    });
  } catch (error) {
    next(error);
  }
});

// ==================== POSTS ====================

// List all posts
router.get('/posts', async (req, res, next) => {
  try {
    const status = req.query.status || 'all';
    
    let where = {};
    if (status !== 'all') {
      where.status = status;
    }

    const posts = await db.select('posts', {
      where,
      join: [{
        table: 'users',
        on: { local: 'authorId', foreign: 'id' },
        as: 'author',
        type: 'left'
      }, {
        table: 'categories',
        on: { local: 'categoryId', foreign: 'id' },
        as: 'category',
        type: 'left'
      }],
      orderBy: ['createdAt', 'desc'],
      silent: true
    });

    res.render('admin/posts/list', {
      title: 'Posts',
      posts,
      currentStatus: status
    });
  } catch (error) {
    next(error);
  }
});

// New post form
router.get('/posts/new', async (req, res, next) => {
  try {
    const categories = await db.select('categories', { silent: true });
    
    res.render('admin/posts/form', {
      title: 'New Post',
      post: null,
      categories
    });
  } catch (error) {
    next(error);
  }
});

// Create post
router.post('/posts', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/admin/posts/new');
    }

    const { title, content, excerpt, categoryId, tags, status } = req.body;

    // Generate slug
    let slug = slugify(title, { lower: true, strict: true });
    
    // Ensure unique slug
    const existingSlugs = await db.select('posts', {
      where: { slug },
      silent: true
    });
    
    if (existingSlugs.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    // Parse tags
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const postData = {
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 150),
      categoryId: categoryId || null,
      tags: tagsArray,
      status: status || 'draft',
      authorId: req.session.user.id
    };

    if (status === 'published' && !postData.publishedAt) {
      postData.publishedAt = new Date().toISOString();
    }

    await db.insert('posts', postData, { silent: true });

    req.flash('success', 'Post created successfully!');
    res.redirect('/admin/posts');
  } catch (error) {
    next(error);
  }
});

// Edit post form
router.get('/posts/:id/edit', async (req, res, next) => {
  try {
    const posts = await db.select('posts', {
      where: { id: req.params.id },
      silent: true
    });

    if (posts.length === 0) {
      req.flash('error', 'Post not found');
      return res.redirect('/admin/posts');
    }

    const categories = await db.select('categories', { silent: true });

    res.render('admin/posts/form', {
      title: 'Edit Post',
      post: posts[0],
      categories
    });
  } catch (error) {
    next(error);
  }
});

// Update post
router.post('/posts/:id', async (req, res, next) => {
  try {
    const { title, content, excerpt, categoryId, tags, status } = req.body;

    const posts = await db.select('posts', {
      where: { id: req.params.id },
      silent: true
    });

    if (posts.length === 0) {
      req.flash('error', 'Post not found');
      return res.redirect('/admin/posts');
    }

    const post = posts[0];

    // Parse tags
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const updateData = {
      title,
      content,
      excerpt: excerpt || content.substring(0, 150),
      categoryId: categoryId || null,
      tags: tagsArray,
      status: status || post.status
    };

    // Set publishedAt if publishing for first time
    if (status === 'published' && post.status !== 'published') {
      updateData.publishedAt = new Date().toISOString();
    }

    await db.update('posts', updateData, { id: req.params.id }, { silent: true });

    req.flash('success', 'Post updated successfully!');
    res.redirect('/admin/posts');
  } catch (error) {
    next(error);
  }
});

// Delete post
router.delete('/posts/:id', async (req, res, next) => {
  try {
    await db.delete('posts', { id: req.params.id }, { cascade: true, silent: true });
    
    req.flash('success', 'Post deleted successfully!');
    res.redirect('/admin/posts');
  } catch (error) {
    next(error);
  }
});

// ==================== COMMENTS ====================

// List comments
router.get('/comments', async (req, res, next) => {
  try {
    const status = req.query.status || 'all';
    
    let where = {};
    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
    }

    const comments = await db.select('comments', {
      where,
      join: [{
        table: 'posts',
        on: { local: 'postId', foreign: 'id' },
        as: 'post',
        type: 'left'
      }],
      orderBy: ['createdAt', 'desc'],
      silent: true
    });

    res.render('admin/comments/list', {
      title: 'Comments',
      comments,
      currentStatus: status
    });
  } catch (error) {
    next(error);
  }
});

// Approve comment
router.post('/comments/:id/approve', async (req, res, next) => {
  try {
    await db.update('comments',
      { isApproved: true },
      { id: req.params.id },
      { silent: true }
    );

    req.flash('success', 'Comment approved!');
    res.redirect('/admin/comments');
  } catch (error) {
    next(error);
  }
});

// Delete comment
router.delete('/comments/:id', async (req, res, next) => {
  try {
    await db.delete('comments', { id: req.params.id }, { silent: true });
    
    req.flash('success', 'Comment deleted!');
    res.redirect('/admin/comments');
  } catch (error) {
    next(error);
  }
});

// ==================== CATEGORIES ====================

// List categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await db.select('categories', {
      orderBy: ['name', 'asc'],
      silent: true
    });

    res.render('admin/categories/list', {
      title: 'Categories',
      categories
    });
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/categories', isAdmin, async (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    const slug = slugify(name, { lower: true, strict: true });

    await db.insert('categories', {
      name,
      slug,
      description: description || '',
      color: color || '#3B82F6'
    }, { silent: true });

    req.flash('success', 'Category created!');
    res.redirect('/admin/categories');
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete('/categories/:id', isAdmin, async (req, res, next) => {
  try {
    await db.delete('categories', { id: req.params.id }, { silent: true });
    
    req.flash('success', 'Category deleted!');
    res.redirect('/admin/categories');
  } catch (error) {
    next(error);
  }
});

// ==================== PROFILE ====================

// Profile page
router.get('/profile', async (req, res, next) => {
  try {
    const users = await db.select('users', {
      where: { id: req.session.user.id },
      silent: true
    });

    if (users.length === 0) {
      return res.redirect('/auth/logout');
    }

    res.render('admin/profile', {
      title: 'Profile',
      user: users[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.post('/profile', async (req, res, next) => {
  try {
    const { displayName, bio, email } = req.body;

    await db.update('users',
      { displayName, bio, email },
      { id: req.session.user.id },
      { silent: true }
    );

    // Update session
    req.session.user.displayName = displayName;
    req.session.user.email = email;

    req.flash('success', 'Profile updated!');
    res.redirect('/admin/profile');
  } catch (error) {
    next(error);
  }
});

// ==================== FILE UPLOAD ====================

// Upload image endpoint
router.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete uploaded image
router.delete('/upload/:filename', async (req, res, next) => {
  try {
    deleteFile(req.params.filename);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;