// routes/public.js - Public-facing routes
const express = require('express');
const router = express.Router();
const db = require('../Dapbase/dapbase.connection.js');

// Ensure database is connected
router.use(async (req, res, next) => {
  try {
    await db.use('akuko');
    next();
  } catch (error) {
    next(error);
  }
});

// Home page - List all published posts
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get published posts with authors
    const posts = await db.select('posts', {
      where: { status: 'published' },
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
      orderBy: ['publishedAt', 'desc'],
      limit,
      offset,
      silent: true
    });

    // Get total count for pagination
    const allPosts = await db.select('posts', {
      where: { status: 'published' },
      silent: true
    });
    const totalPages = Math.ceil(allPosts.length / limit);

    // Get categories for sidebar
    const categories = await db.select('categories', { silent: true });

    // Get recent posts for sidebar
    const recentPosts = await db.select('posts', {
      where: { status: 'published' },
      orderBy: ['publishedAt', 'desc'],
      limit: 5,
      fields: ['id', 'title', 'slug', 'publishedAt'],
      silent: true
    });

    // Normalize tags for all posts
    posts.forEach(post => {
      if (typeof post.tags === 'string') {
        try {
          post.tags = JSON.parse(post.tags);
        } catch {
          post.tags = [];
        }
      } else if (!Array.isArray(post.tags)) {
        post.tags = [];
      }
    });

    res.render('public/home', {
      title: 'Home',
      posts,
      categories,
      recentPosts,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    next(error);
  }
});

// Single post page
router.get('/post/:slug', async (req, res, next) => {
  try {
    const posts = await db.select('posts', {
      where: { slug: req.params.slug, status: 'published' },
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
      silent: true
    });

    if (posts.length === 0) {
      return res.status(404).render('errors/404', {
        title: 'Post Not Found',
        message: 'The post you are looking for does not exist.'
      });
    }

    const post = posts[0];
    // Parse tags if it's a string
    if (typeof post.tags === 'string') {
      try {
        post.tags = JSON.parse(post.tags);
      } catch (e) {
        console.error('Failed to parse tags for post', post.id, e);
        post.tags = []; // fallback
      }
    } else if (!Array.isArray(post.tags)) {
      post.tags = []; // safety
    }
    // Increment view count
    await db.update('posts', 
      { views: post.views + 1 },
      { id: post.id },
      { silent: true }
    );

    // Get comments for this post
    const comments = await db.select('comments', {
      where: { postId: post.id, isApproved: true },
      orderBy: ['createdAt', 'asc'],
      silent: true
    });

    // Get related posts (same category)
    let relatedPosts = [];
    if (post.categoryId) {
      relatedPosts = await db.select('posts', {
        where: { 
          categoryId: post.categoryId,
          status: 'published'
        },
        orderBy: ['publishedAt', 'desc'],
        limit: 3,
        fields: ['id', 'title', 'slug', 'excerpt', 'publishedAt'],
        silent: true
      });
      // Remove current post from related
      relatedPosts = relatedPosts.filter(p => p.id !== post.id);
    }

    res.render('public/post', {
      title: post.title,
      post,
      comments,
      relatedPosts
    });
  } catch (error) {
    next(error);
  }
});

// Category page
router.get('/category/:slug', async (req, res, next) => {
  try {
    // Get category
    const categories = await db.select('categories', {
      where: { slug: req.params.slug },
      silent: true
    });

    if (categories.length === 0) {
      return res.status(404).render('errors/404', {
        title: 'Category Not Found',
        message: 'The category you are looking for does not exist.'
      });
    }

    const category = categories[0];

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get posts in this category
    const posts = await db.select('posts', {
      where: { 
        categoryId: category.id,
        status: 'published'
      },
      join: [{
        table: 'users',
        on: { local: 'authorId', foreign: 'id' },
        as: 'author',
        type: 'left'
      }],
      orderBy: ['publishedAt', 'desc'],
      limit,
      offset,
      silent: true
    });

    // Normalize tags for all posts
    posts.forEach(post => {
      if (typeof post.tags === 'string') {
        try {
          post.tags = JSON.parse(post.tags);
        } catch {
          post.tags = [];
        }
      } else if (!Array.isArray(post.tags)) {
        post.tags = [];
      }
    });

    // Get total count
    const allPosts = await db.select('posts', {
      where: { 
        categoryId: category.id,
        status: 'published'
      },
      silent: true
    });
    const totalPages = Math.ceil(allPosts.length / limit);

    res.render('public/category', {
      title: category.name,
      category,
      posts,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    next(error);
  }
});

// Search
// router.get('/search', async (req, res, next) => {
//   try {
//     const query = req.query.q || '';
    
//     if (!query) {
//       return res.render('public/search', {
//         title: 'Search',
//         posts: [],
//         query: ''
//       });
//     }

//     // Search in title and content
//     const allPosts = await db.select('posts', {
//       where: { status: 'published' },
//       join: [{
//         table: 'users',
//         on: { local: 'authorId', foreign: 'id' },
//         as: 'author',
//         type: 'left'
//       }],
//       silent: true
//     });

//     const posts = allPosts.filter(post => 
//       post.title.toLowerCase().includes(query.toLowerCase()) ||
//       post.content.toLowerCase().includes(query.toLowerCase()) ||
//       (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
//     );

//     // Normalize tags for all posts
//     posts.forEach(post => {
//       if (typeof post.tags === 'string') {
//         try {
//           post.tags = JSON.parse(post.tags);
//         } catch {
//           post.tags = [];
//         }
//       } else if (!Array.isArray(post.tags)) {
//         post.tags = [];
//       }
//     });

//     res.render('public/search', {
//       title: `Search: ${query}`,
//       posts,
//       query
//     });
//   } catch (error) {
//     next(error);
//   }
// });

router.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q || '';
    
    if (!query.trim()) {
      return res.render('public/search', {
        title: 'Search',
        posts: [],
        query: ''
      });
    }

    const allPosts = await db.select('posts', {
      where: { status: 'published' },
      join: [{
        table: 'users',
        on: { local: 'authorId', foreign: 'id' },
        as: 'author',
        type: 'left'
      }],
      silent: true
    });

    // ─── IMPORTANT: Normalize tags for ALL posts ───
    allPosts.forEach(post => {
      if (typeof post.tags === 'string') {
        try {
          post.tags = JSON.parse(post.tags);
        } catch (err) {
          console.error(`Failed to parse tags for post ${post.id || post.slug}:`, err);
          post.tags = [];
        }
      }
      // Safety net: make sure it's always an array
      if (!Array.isArray(post.tags)) {
        post.tags = [];
      }
    });

    // Now .some() will work safely
    const posts = allPosts.filter(post => 
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.content.toLowerCase().includes(query.toLowerCase()) ||
      (post.tags.length > 0 && post.tags.some(tag => 
        typeof tag === 'string' && tag.toLowerCase().includes(query.toLowerCase())
      ))
    );

    res.render('public/search', {
      title: `Search: ${query}`,
      posts,
      query
    });
  } catch (error) {
    next(error);
  }
});

// Static page
router.get('/page/:slug', async (req, res, next) => {
  try {
    const pages = await db.select('pages', {
      where: { slug: req.params.slug, isPublished: true },
      silent: true
    });

    if (pages.length === 0) {
      return res.status(404).render('errors/404', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.'
      });
    }

    res.render('public/page', {
      title: pages[0].title,
      page: pages[0]
    });
  } catch (error) {
    next(error);
  }
});

// Post comment
router.post('/post/:slug/comment', async (req, res, next) => {
  try {
    const { name, email, content } = req.body;

    if (!name || !email || !content) {
      req.flash('error', 'All fields are required');
      return res.redirect(`/post/${req.params.slug}#comments`);
    }

    // Get post
    const posts = await db.select('posts', {
      where: { slug: req.params.slug },
      silent: true
    });

    if (posts.length === 0) {
      return res.status(404).send('Post not found');
    }

    // Insert comment
    await db.insert('comments', {
      content,
      authorName: name,
      authorEmail: email,
      postId: posts[0].id,
      userId: req.session.user ? req.session.user.id : null,
      isApproved: false, // Requires moderation
      ipAddress: req.ip
    }, { silent: true });

    req.flash('success', 'Comment submitted! It will appear after moderation.');
    res.redirect(`/post/${req.params.slug}#comments`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;