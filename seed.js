// scripts/seed.js - Seed database with sample data
const db = require('../Dapbase/dapbase.connection.js');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding database...\n');
  
  try {
    await db.use('akuko');
    
    // Check if data already exists
    const existingUsers = await db.select('users', { silent: true });
    if (existingUsers.length > 1) {
      console.log('⚠️  Database already has data. Skipping seed.');
      return;
    }
    
    // Create sample users
    console.log('👥 Creating sample users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const john = await db.insert('users', {
      username: 'johndoe',
      email: 'john@example.com',
      displayName: 'John Doe',
      passwordHash,
      bio: 'Tech enthusiast and writer',
      role: 'user'
    }, { silent: true });
    
    const jane = await db.insert('users', {
      username: 'janedoe',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      passwordHash,
      bio: 'Creative storyteller',
      role: 'user'
    }, { silent: true });
    
    console.log('✓ Created 2 sample users\n');
    
    // Get categories
    const categories = await db.select('categories', { silent: true });
    const techCat = categories.find(c => c.slug === 'technology');
    const lifeCat = categories.find(c => c.slug === 'life');
    
    // Create sample posts
    console.log('📝 Creating sample posts...');
    
    const samplePosts = [
      {
        title: 'Getting Started with Node.js',
        slug: 'getting-started-nodejs',
        content: `# Getting Started with Node.js

Node.js has revolutionized JavaScript development by bringing it to the server-side. In this post, we'll explore the fundamentals.

## What is Node.js?

Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. It allows you to run JavaScript on the server.

## Why Use Node.js?

1. **Fast & Scalable** - Non-blocking I/O model
2. **JavaScript Everywhere** - Same language for frontend and backend
3. **Large Ecosystem** - npm has millions of packages
4. **Active Community** - Great support and resources

## Getting Started

\`\`\`bash
# Install Node.js
# Download from nodejs.org

# Check installation
node --version
npm --version
\`\`\`

Happy coding! 🚀`,
        excerpt: 'Learn the basics of Node.js and why it\'s so popular',
        authorId: john.id,
        categoryId: techCat ? techCat.id : null,
        status: 'published',
        publishedAt: new Date().toISOString(),
        tags: ['nodejs', 'javascript', 'tutorial']
      },
      {
        title: 'My Journey into Web Development',
        slug: 'journey-web-development',
        content: `# My Journey into Web Development

Looking back at how I started my career in web development brings back great memories.

## The Beginning

I started with HTML and CSS, building simple websites. It was magical seeing my code come to life in the browser.

## Learning JavaScript

JavaScript was challenging at first, but it opened up a whole new world of possibilities. Interactive websites became possible!

## What I've Learned

- Never stop learning
- Build projects to practice
- Join communities
- Share your knowledge
- Be patient with yourself

The journey continues... 🌟`,
        excerpt: 'A personal reflection on becoming a web developer',
        authorId: jane.id,
        categoryId: lifeCat ? lifeCat.id : null,
        status: 'published',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        tags: ['career', 'personal', 'webdev']
      },
      {
        title: 'Understanding Async/Await in JavaScript',
        slug: 'async-await-javascript',
        content: `# Understanding Async/Await

Asynchronous programming can be confusing. Let's demystify async/await!

## Promises First

Before async/await, we had Promises:

\`\`\`javascript
fetch('/api/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));
\`\`\`

## The Async/Await Way

Much cleaner syntax:

\`\`\`javascript
async function getData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}
\`\`\`

## Key Takeaways

- Use async/await for cleaner code
- Always handle errors with try/catch
- Remember async functions return promises
- await only works inside async functions

Happy coding! ⚡`,
        excerpt: 'Master asynchronous JavaScript with async/await',
        authorId: john.id,
        categoryId: techCat ? techCat.id : null,
        status: 'published',
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        tags: ['javascript', 'async', 'programming']
      },
      {
        title: 'Building a Blog with Dapbase',
        slug: 'building-blog-dapbase',
        content: `# Building a Blog with Dapbase

Dapbase makes it incredibly easy to build database-driven applications. Here's how I built this blog!

## Why Dapbase?

- **Simple** - No complex setup
- **File-based** - Your data in readable files
- **Full-featured** - Schema validation, relationships, joins
- **Fast** - Perfect for small to medium apps

## Getting Started

\`\`\`javascript
const db = require('./Dapbase/dapbase.connection.js');

await db.use('blog');
await db.createTable('posts', {
  title: { type: 'string', required: true },
  content: { type: 'text' }
});
\`\`\`

## Features I Love

1. Auto-generated timestamps
2. Built-in validation
3. Foreign key support
4. Simple query syntax

Check out Dapbase on npm! 🎉`,
        excerpt: 'How I built this blog using Dapbase',
        authorId: john.id,
        categoryId: techCat ? techCat.id : null,
        status: 'draft',
        tags: ['dapbase', 'blog', 'tutorial']
      }
    ];
    
    for (const postData of samplePosts) {
      await db.insert('posts', postData, { silent: true });
    }
    
    console.log(`✓ Created ${samplePosts.length} sample posts\n`);
    
    // Create sample comments
    console.log('💬 Creating sample comments...');
    
    const publishedPosts = await db.select('posts', {
      where: { status: 'published' },
      silent: true
    });
    
    const sampleComments = [
      {
        content: 'Great introduction to Node.js! Very helpful for beginners.',
        authorName: 'Alice Smith',
        authorEmail: 'alice@example.com',
        postId: publishedPosts[0].id,
        isApproved: true
      },
      {
        content: 'Thanks for sharing your journey! Very inspiring.',
        authorName: 'Bob Johnson',
        authorEmail: 'bob@example.com',
        postId: publishedPosts[1].id,
        isApproved: true
      },
      {
        content: 'This cleared up so much confusion about async/await!',
        authorName: 'Charlie Brown',
        authorEmail: 'charlie@example.com',
        postId: publishedPosts[2].id,
        isApproved: false
      }
    ];
    
    for (const comment of sampleComments) {
      await db.insert('comments', comment, { silent: true });
    }
    
    console.log(`✓ Created ${sampleComments.length} sample comments\n`);
    
    console.log('✅ Seeding complete!\n');
    console.log('Sample login credentials:');
    console.log('  Username: johndoe or janedoe');
    console.log('  Password: password123\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));