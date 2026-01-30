// scripts/seed.js - Improved database seeder
const { json } = require('express');
const db = require('./Dapbase/dapbase.connection');
const bcrypt = require('bcryptjs');

const SAMPLE_PASSWORD = 'password123';

async function seed() {
  console.log('🌱 Starting database seed...\n');
  console.log('Using database: akuko\n');

  try {
    await db.use('akuko');

    // ────────────────────────────────────────────────
    // 1. Users
    // ────────────────────────────────────────────────
    console.log('👤 Checking/creating users...');

    const existingUsers = await db.select('users', { silent: true });
    const usernamesToCreate = ['admin', 'johndoe', 'janedoe'];

    const usersToCreate = usernamesToCreate.filter(
      u => !existingUsers.some(existing => existing.username === u)
    );

    if (usersToCreate.length === 0) {
      console.log('  → All sample users already exist. Skipping.');
    } else {
      const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10);

      const userData = [];

      if (usersToCreate.includes('admin')) {
        userData.push({
          username: 'admin',
          email: 'admin@akuko.local',
          displayName: 'Administrator',
          passwordHash,
          role: 'admin',
          isActive: true,
          avatar: '/images/default-avatar.png',
          bio: "something short"
          // bio intentionally omitted - field does not exist in schema
        });
      }

      if (usersToCreate.includes('johndoe')) {
        userData.push({
          username: 'johndoe',
          email: 'john@example.com',
          displayName: 'John Doe',
          passwordHash,
          role: 'user',
          isActive: true,
          bio: "something short",
          avatar: '/images/default-avatar.png'
        });
      }

      if (usersToCreate.includes('janedoe')) {
        userData.push({
          username: 'janedoe',
          email: 'jane@example.com',
          displayName: 'Jane Doe',
          passwordHash,
          role: 'user',
          isActive: true,
          bio: "something short",
          avatar: '/images/default-avatar.png'
        });
      }

      for (const data of userData) {
        await db.insert('users', data, { silent: true });
        console.log(`  Created user: ${data.username}`);
      }
    }

    // Load users for reference
    const users = await db.select('users', { silent: true });
    const admin = users.find(u => u.username === 'admin');
    const john = users.find(u => u.username === 'johndoe');
    const jane = users.find(u => u.username === 'janedoe');

    // ────────────────────────────────────────────────
    // 2. Categories
    // ────────────────────────────────────────────────
    console.log('\n🏷️  Checking/creating categories...');

    const categorySlugs = ['technology', 'lifestyle', 'education', 'food'];
    const existingCategories = await db.select('categories', { silent: true });
    const categoriesToCreate = [];

    const categoryTemplates = [
      { name: 'Technology', slug: 'technology', color: '#3B82F6', description: 'Tech news, tutorials & tools' },
      { name: 'Lifestyle',   slug: 'lifestyle',   color: '#EC4899', description: 'Life, travel, wellness & stories' },
      { name: 'Education',   slug: 'education',   color: '#10B981', description: 'Learning, career & skill development' },
      { name: 'Food',        slug: 'food',        color: '#F59E0B', description: 'Recipes, local eats & food culture' }
    ];

    for (const cat of categoryTemplates) {
      if (!existingCategories.some(c => c.slug === cat.slug)) {
        categoriesToCreate.push(cat);
      }
    }

    let createdCategories = [];
    if (categoriesToCreate.length > 0) {
      for (const cat of categoriesToCreate) {
        const newCat = await db.insert('categories', cat, { silent: true });
        createdCategories.push(newCat);
        console.log(`  Created category: ${cat.name}`);
      }
    }

    // Final category map
    const allCategories = [...existingCategories, ...createdCategories];
    const techCat     = allCategories.find(c => c.slug === 'technology');
    const lifeCat     = allCategories.find(c => c.slug === 'lifestyle');
    const eduCat      = allCategories.find(c => c.slug === 'education');
    const foodCat     = allCategories.find(c => c.slug === 'food');

    // ────────────────────────────────────────────────
    // 3. Posts
    // ────────────────────────────────────────────────
    console.log('\n📝 Checking/creating sample posts...');

    const existingPosts = await db.select('posts', { silent: true });
    const existingSlugs = new Set(existingPosts.map(p => p.slug));

    const samplePosts = [
      {
        title: 'Getting Started with Node.js in 2025',
        slug: 'getting-started-nodejs-2025',
        content: `# Getting Started with Node.js in 2025\n\nNode.js remains one of the most popular runtimes...\n\n(Imagine a long article here with code blocks, lists, etc.)`,
        excerpt: 'Modern guide to setting up Node.js and building your first API',
        authorId: john?.id,
        categoryId: techCat?.id,
        tags: JSON.stringify(['nodejs', 'javascript', 'backend', 'tutorial']),
        status: 'published',
        publishedAt: new Date('2025-11-10').toISOString()
      },
      {
        title: '10 Healthy Nigerian Breakfast Ideas',
        slug: 'healthy-nigerian-breakfast-ideas',
        content: `From akara & pap to oats with tiger nuts...\n\nFull recipes inside!`,
        excerpt: 'Quick, nutritious breakfasts using local ingredients',
        authorId: jane?.id,
        categoryId: foodCat?.id,
        tags: JSON.stringify(['nigerian-food', 'breakfast', 'healthy', 'recipes']),
        status: 'published',
        publishedAt: new Date('2025-12-05').toISOString()
      },
      {
        title: 'How I Prepare for Tech Interviews in Nigeria',
        slug: 'tech-interview-prep-nigeria-2025',
        content: `LeetCode patterns, system design tips, behavioral questions...\n\nRealistic roadmap for 2025.`,
        excerpt: 'Practical guide for landing tech roles in Lagos & beyond',
        authorId: john?.id,
        categoryId: eduCat?.id,
        tags: JSON.stringify(['career', 'interview', 'tech-jobs', 'nigeria']),
        status: 'published',
        publishedAt: new Date('2026-01-08').toISOString()
      },
      {
        title: 'Building This Blog – Behind the Scenes',
        slug: 'building-this-blog-dapbase',
        content: `Why I chose Dapbase, architecture decisions, challenges...\n\n(Still a work in progress)`,
        excerpt: 'How this very blog was built',
        authorId: admin?.id,
        categoryId: techCat?.id,
        tags: JSON.stringify(['dapbase', 'blog', 'development']),
        status: 'draft'
      }
    ];

    let postsCreated = 0;
    for (const post of samplePosts) {
      if (!existingSlugs.has(post.slug)) {
        await db.insert('posts', post, { silent: true });
        postsCreated++;
        console.log(`  Created post: ${post.title}`);
      }
    }
    console.log(`  → ${postsCreated} new posts created`);

    // ────────────────────────────────────────────────
    // 4. Comments
    // ────────────────────────────────────────────────
    console.log('\n💬 Creating sample comments (if needed)...');

    const publishedPosts = await db.select('posts', {
      where: { status: 'published' },
      silent: true
    });

    if (publishedPosts.length > 0) {
      const sampleComments = [
        {
          content: 'Very clear and helpful intro to Node.js — thank you!',
          authorName: 'Samuel E.',
          authorEmail: 'samuel@example.com',
          postId: publishedPosts[0]?.id,
          isApproved: true
        },
        {
          content: 'These breakfast ideas are saving my mornings ❤️',
          authorName: 'Chioma',
          authorEmail: 'chioma.ng@gmail.com',
          postId: publishedPosts[1]?.id,
          isApproved: true
        },
        {
          content: 'Great tips! But how do you handle imposter syndrome during interviews?',
          authorName: 'Tega',
          authorEmail: 'tega.dev@outlook.com',
          postId: publishedPosts[2]?.id,
          isApproved: false     // pending moderation
        }
      ];

      let commentsCreated = 0;
      for (const comment of sampleComments) {
        // Simple check to avoid duplicates (not perfect, but good enough for seed)
        const existing = await db.select('comments', {
          where: { content: comment.content },
          silent: true
        });
        if (existing.length === 0) {
          await db.insert('comments', comment, { silent: true });
          commentsCreated++;
        }
      }
      console.log(`  → ${commentsCreated} new comments added`);
    }

    // ────────────────────────────────────────────────
    console.log('\n✅ Seeding finished successfully!\n');
    console.log('You can now log in with:');
    console.log('  • admin          /  password123  (admin role)');
    console.log('  • johndoe        /  password123');
    console.log('  • janedoe        /  password123\n');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));