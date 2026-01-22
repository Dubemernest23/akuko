// setup.js - Initialize blog database and create admin user

const db = require('./Dapbase/dapbase.connection.js');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupDatabase() {
  console.log('🚀 Setting up Akuko Blog Database...\n');

  try {
    // Use blog database
    await db.use('akuko');
    console.log('✓ Database "akuko" initialized\n');

    // Create users table
    await db.createTable('users', {
      username: { type: 'string', required: true, unique: true, minLength: 3 },
      email: { type: 'string', required: true, unique: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      passwordHash: { type: 'string', required: true },
      displayName: { type: 'string', required: true },
      bio: { type: 'text', default: '' },
      role: { type: 'string', default: 'user' }, // 'admin' or 'user'
      avatar: { type: 'string', default: '/images/default-avatar.png' },
      isActive: { type: 'boolean', default: true }
    });
    console.log('✓ Created "users" table');

    // Create categories table
    await db.createTable('categories', {
      name: { type: 'string', required: true, unique: true },
      slug: { type: 'string', required: true, unique: true },
      description: { type: 'text', default: '' },
      color: { type: 'string', default: '#3B82F6' }
    });
    console.log('✓ Created "categories" table');

    // Create posts table
    await db.createTable('posts', {
      title: { type: 'string', required: true, maxLength: 200 },
      slug: { type: 'string', required: true, unique: true },
      content: { type: 'text', required: true },
      excerpt: { type: 'text', default: '' },
      featuredImage: { type: 'string', default: '' },
      status: { type: 'string', default: 'draft' }, // 'draft', 'published', 'archived'
      views: { type: 'integer', default: 0, min: 0 },
      authorId: { type: 'uuid', required: true },
      categoryId: { type: 'uuid' },
      tags: { type: 'json', default: [] },
      publishedAt: { type: 'string' }
    }, {
      authorId: { foreignTable: 'users', foreignKey: 'id' },
      categoryId: { foreignTable: 'categories', foreignKey: 'id' }
    });
    console.log('✓ Created "posts" table');

    // Create comments table
    await db.createTable('comments', {
      content: { type: 'text', required: true, minLength: 1 },
      authorName: { type: 'string', required: true },
      authorEmail: { type: 'string', required: true },
      postId: { type: 'uuid', required: true },
      userId: { type: 'uuid' },
      parentId: { type: 'uuid' }, // For nested comments
      isApproved: { type: 'boolean', default: false },
      ipAddress: { type: 'string', default: '' }
    }, {
      postId: { foreignTable: 'posts', foreignKey: 'id' },
      userId: { foreignTable: 'users', foreignKey: 'id' },
      parentId: { foreignTable: 'comments', foreignKey: 'id' }
    });
    console.log('✓ Created "comments" table');

    // Create pages table (for static pages like About, Contact)
    await db.createTable('pages', {
      title: { type: 'string', required: true },
      slug: { type: 'string', required: true, unique: true },
      content: { type: 'text', required: true },
      isPublished: { type: 'boolean', default: true },
      order: { type: 'integer', default: 0 }
    });
    console.log('✓ Created "pages" table');

    // Create settings table
    await db.createTable('settings', {
      key: { type: 'string', required: true, unique: true },
      value: { type: 'text', required: true },
      type: { type: 'string', default: 'string' } // 'string', 'number', 'boolean', 'json'
    }, {}, { timestamps: false });
    console.log('✓ Created "settings" table');

    // Add indexes for performance
    await db.addIndex('posts', 'slug', { type: 'hash', unique: true });
    await db.addIndex('posts', 'status', { type: 'hash' });
    await db.addIndex('users', 'email', { type: 'hash', unique: true });
    await db.addIndex('users', 'username', { type: 'hash', unique: true });
    console.log('✓ Added performance indexes\n');

    // Insert default categories
    const defaultCategories = [
      { name: 'Technology', slug: 'technology', description: 'Tech articles and tutorials', color: '#3B82F6' },
      { name: 'Life', slug: 'life', description: 'Personal thoughts and experiences', color: '#10B981' },
      { name: 'Stories', slug: 'stories', description: 'Narratives and tales', color: '#F59E0B' },
      { name: 'Thoughts', slug: 'thoughts', description: 'Random musings', color: '#8B5CF6' }
    ];

    for (const category of defaultCategories) {
      await db.insert('categories', category, { silent: true });
    }
    console.log('✓ Added default categories\n');

    // Insert default settings
    const defaultSettings = [
      { key: 'site_title', value: 'Akuko', type: 'string' },
      { key: 'site_description', value: 'Personal thoughts and stories', type: 'string' },
      { key: 'posts_per_page', value: '10', type: 'number' },
      { key: 'allow_comments', value: 'true', type: 'boolean' },
      { key: 'comment_moderation', value: 'true', type: 'boolean' }
    ];

    for (const setting of defaultSettings) {
      await db.insert('settings', setting, { silent: true });
    }
    console.log('✓ Added default settings\n');

    // Create admin user
    console.log('📝 Create Admin Account\n');
    const username = await question('Admin username: ');
    const email = await question('Admin email: ');
    const displayName = await question('Display name: ');
    const password = await question('Password: ');

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await db.insert('users', {
      username,
      email,
      displayName,
      passwordHash,
      role: 'admin',
      bio: 'Blog administrator',
      isActive: true
    }, { silent: true });

    console.log('\n✅ Admin user created successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}\n`);

    // Create a welcome post
    const welcomePost = await db.insert('posts', {
      title: 'Welcome to Akuko',
      slug: 'welcome-to-akuko',
      content: `# Welcome to Akuko

This is your first blog post! Edit or delete this post to get started.

## What is Akuko?

Akuko (meaning "story" in Igbo) is your personal space to share thoughts, stories, and experiences.

## Getting Started

1. Log in to the admin panel at \`/admin\`
2. Create new posts from the dashboard
3. Customize your blog settings
4. Share your stories with the world!

Happy writing! ✍️`,
      excerpt: 'Welcome to your new blog built with Dapbase!',
      status: 'published',
      authorId: admin.id,
      publishedAt: new Date().toISOString(),
      tags: ['welcome', 'introduction']
    }, { silent: true });

    console.log('✓ Created welcome post\n');

    console.log('🎉 Setup complete! Your blog is ready.\n');
    console.log('Run `npm run dev` to start the development server.\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
  }
}

setupDatabase();