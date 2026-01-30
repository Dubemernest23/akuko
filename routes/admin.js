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
    const allPosts = await db.select('posts', { silent: true });
    const publishedPosts = allPosts.filter(p => p.status === 'published');
    const draftPosts = allPosts.filter(p => p.status === 'draft');
    
    const allComments = await db.select('comments', { silent: true });
    const pendingComments = allComments.filter(c => !c.isApproved);
    
    const categories = await db.select('categories', { silent: true });

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
    console.error('Dashboard error:', error);
    next(error);
  }
});

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

    // Optional: normalize tags for display if needed in list view
    posts.forEach(post => {
      if (typeof post.tags === 'string') {
        try {
          post.tags = JSON.parse(post.tags);
        } catch {
          post.tags = [];
        }
      }
      if (!Array.isArray(post.tags)) post.tags = [];
    });

    res.render('admin/posts/list', {
      title: 'Posts',
      posts,
      currentStatus: status
    });
  } catch (error) {
    console.error('Posts list error:', error);
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
    console.error('New post form error:', error);
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

    const { title, content, excerpt, categoryId, tags, status, featuredImage } = req.body;

    // Generate unique slug
    let slug = slugify(title, { lower: true, strict: true });
    const existingSlugs = await db.select('posts', { where: { slug }, silent: true });
    if (existingSlugs.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    // Parse tags → always convert to array → then stringify for DB
    let tagsArray = [];
    if (tags) {
      if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      } else if (Array.isArray(tags)) {
        tagsArray = tags.map(t => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
      }
    }
    const tagsJson = JSON.stringify(tagsArray);

    // Handle featured image (sometimes sent as array from form)
    let imageUrl = '';
    if (featuredImage) {
      if (Array.isArray(featuredImage)) {
        imageUrl = featuredImage.find(img => img && typeof img === 'string' && img.trim()) || '';
      } else if (typeof featuredImage === 'string' && featuredImage.trim()) {
        imageUrl = featuredImage.trim();
      }
    }

    const postData = {
      title,
      slug,
      content,
      excerpt: excerpt || (content ? content.substring(0, 150) : ''),
      featuredImage: imageUrl,
      categoryId: categoryId || null,
      tags: tagsJson,               // ← JSON string
      status: status || 'draft',
      authorId: req.session.user.id
    };

    if (status === 'published') {
      postData.publishedAt = new Date().toISOString();
    }

    await db.insert('posts', postData, { silent: true });

    req.flash('success', 'Post created successfully!');
    res.redirect('/admin/posts');
  } catch (error) {
    console.error('Create post error:', error.message, error.stack);
    req.flash('error', 'Failed to create post. Please try again.');
    res.redirect('/admin/posts/new');
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

    const post = posts[0];

    // Normalize tags to array for the form (EJS will join it)
    let tagsArray = [];
    if (post.tags) {
      if (typeof post.tags === 'string') {
        try {
          tagsArray = JSON.parse(post.tags);
        } catch (e) {
          console.error('Failed to parse tags in edit form:', e);
        }
      } else if (Array.isArray(post.tags)) {
        tagsArray = post.tags;
      }
    }

    // Ensure it's always an array
    post.tags = Array.isArray(tagsArray) ? tagsArray : [];

    const categories = await db.select('categories', { silent: true });

    res.render('admin/posts/form', {
      title: 'Edit Post',
      post,
      categories
    });
  } catch (error) {
    console.error('Edit post form error:', error);
    next(error);
  }
});

// Update post
router.post('/posts/:id', async (req, res, next) => {
  try {
    const { title, content, excerpt, categoryId, tags, status, featuredImage } = req.body;

    const posts = await db.select('posts', {
      where: { id: req.params.id },
      silent: true
    });

    if (posts.length === 0) {
      req.flash('error', 'Post not found');
      return res.redirect('/admin/posts');
    }

    const post = posts[0];

    // Tags: string → array → JSON
    let tagsArray = [];
    if (tags) {
      if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      } else if (Array.isArray(tags)) {
        tagsArray = tags.map(t => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
      }
    }
    const tagsJson = JSON.stringify(tagsArray);

    // Featured image
    let imageUrl = post.featuredImage || '';
    if (featuredImage) {
      if (Array.isArray(featuredImage)) {
        imageUrl = featuredImage.find(img => img && typeof img === 'string' && img.trim()) || imageUrl;
      } else if (typeof featuredImage === 'string' && featuredImage.trim()) {
        imageUrl = featuredImage.trim();
      }
    }

    const updateData = {
      title,
      content,
      excerpt: excerpt || (content ? content.substring(0, 150) : ''),
      featuredImage: imageUrl,
      categoryId: categoryId || null,
      tags: tagsJson,                    // ← JSON string
      status: status || post.status
    };

    if (status === 'published' && post.status !== 'published') {
      updateData.publishedAt = new Date().toISOString();
    }

    await db.update('posts', updateData, { id: req.params.id }, { silent: true });

    req.flash('success', 'Post updated successfully!');
    res.redirect('/admin/posts');
  } catch (error) {
    console.error('Update post error:', error.message, error.stack);
    req.flash('error', 'Failed to update post.');
    res.redirect(`/admin/posts/${req.params.id}/edit`);
  }
});

// Delete post
router.delete('/posts/:id', async (req, res, next) => {
  try {
    await db.delete('posts', { id: req.params.id }, { cascade: true, silent: true });
    req.flash('success', 'Post deleted successfully!');
    res.redirect('/admin/posts');
  } catch (error) {
    console.error('Delete post error:', error);
    next(error);
  }
});

// ────────────────────────────────────────────────
// COMMENTS ────────────────────────────────────────
// ────────────────────────────────────────────────

router.get('/comments', async (req, res, next) => {
  try {
    const status = req.query.status || 'all';
    let where = {};
    if (status === 'pending') where.isApproved = false;
    if (status === 'approved') where.isApproved = true;

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
    console.error('Comments list error:', error);
    next(error);
  }
});

router.post('/comments/:id/approve', async (req, res, next) => {
  try {
    await db.update('comments', { isApproved: true }, { id: req.params.id }, { silent: true });
    req.flash('success', 'Comment approved!');
    res.redirect('/admin/comments');
  } catch (error) {
    console.error('Approve comment error:', error);
    next(error);
  }
});

router.delete('/comments/:id', async (req, res, next) => {
  try {
    await db.delete('comments', { id: req.params.id }, { silent: true });
    req.flash('success', 'Comment deleted!');
    res.redirect('/admin/comments');
  } catch (error) {
    console.error('Delete comment error:', error);
    next(error);
  }
});

// ────────────────────────────────────────────────
// CATEGORIES ──────────────────────────────────────
// ────────────────────────────────────────────────

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await db.select('categories', {
      orderBy: ['name', 'asc'],
      silent: true
    });
    res.render('admin/categories/list', { title: 'Categories', categories });
  } catch (error) {
    console.error('Categories list error:', error);
    next(error);
  }
});

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
    console.error('Create category error:', error);
    next(error);
  }
});

router.delete('/categories/:id', isAdmin, async (req, res, next) => {
  try {
    await db.delete('categories', { id: req.params.id }, { silent: true });
    req.flash('success', 'Category deleted!');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Delete category error:', error);
    next(error);
  }
});

// ────────────────────────────────────────────────
// PROFILE ─────────────────────────────────────────
// ────────────────────────────────────────────────

router.get('/profile', async (req, res, next) => {
  try {
    const users = await db.select('users', {
      where: { id: req.session.user.id },
      silent: true
    });

    if (users.length === 0) return res.redirect('/auth/logout');

    res.render('admin/profile/profile', { title: 'Profile', user: users[0] });
  } catch (error) {
    console.error('Profile load error:', error);
    next(error);
  }
});

router.post('/profile', async (req, res, next) => {
  try {
    const { displayName, bio, email } = req.body;

    await db.update('users',
      { displayName, bio, email },
      { id: req.session.user.id },
      { silent: true }
    );

    req.session.user.displayName = displayName;
    req.session.user.email = email;

    req.flash('success', 'Profile updated!');
    res.redirect('/admin/profile');
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
});

// ────────────────────────────────────────────────
// FILE UPLOAD ─────────────────────────────────────
// ────────────────────────────────────────────────

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: imageUrl, filename: req.file.filename });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/upload/:filename', async (req, res) => {
  try {
    deleteFile(req.params.filename);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;