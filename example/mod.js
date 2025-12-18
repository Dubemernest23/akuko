const db = require('dapbase');
const crypto = require('crypto');
const slugify = require('slugify');

class Database {
  constructor() {
    this.db = db;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('📦 Initializing database...');
      await this.db.use(process.env.DB_NAME || 'akuko_blog');
      this.initialized = true;
      console.log('✅ Database initialized successfully');
      return this;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async setupSchema() {
    console.log('📝 Setting up database schema...');
    
    try {
      await this.createTables();
      await this.createDefaultAdmin();
      await this.createIndexes();
      
      console.log('✅ Database schema setup complete');
    } catch (error) {
      console.error('❌ Schema setup failed:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      this.createPostsTable(),
      this.createCommentsTable(),
      this.createAdminTable(),
      this.createTagsTable()
    ];
    
    await Promise.all(tables);
  }

  async createPostsTable() {
    const tableExists = await this.checkTableExists('posts');
    if (tableExists) {
      console.log('📁 Posts table already exists');
      return;
    }

    await this.db.createTable('posts', {
      title: { 
        type: 'text', 
        required: true,
        maxLength: 200 
      },
      slug: { 
        type: 'text', 
        unique: true,
        required: true 
      },
      content: { 
        type: 'text', 
        required: true 
      },
      excerpt: { 
        type: 'text',
        maxLength: 300 
      },
      featured_image: { 
        type: 'text' 
      },
      status: { 
        type: 'text', 
        default: 'draft',
        enum: ['draft', 'published', 'archived']
      },
      published_at: { 
        type: 'timestamp' 
      },
      views: { 
        type: 'int', 
        default: 0 
      }
    }, {}, {
      timestamps: true
    });

    console.log('✅ Posts table created');
  }

  async createCommentsTable() {
    const tableExists = await this.checkTableExists('comments');
    if (tableExists) {
      console.log('📁 Comments table already exists');
      return;
    }

    await this.db.createTable('comments', {
      post_id: { 
        type: 'uuid', 
        required: true 
      },
      author_name: { 
        type: 'text',
        default: 'Anonymous',
        maxLength: 50 
      },
      content: { 
        type: 'text', 
        required: true,
        minLength: 3,
        maxLength: 1000 
      },
      email: { 
        type: 'text',
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      },
      website: { 
        type: 'text' 
      },
      ip_address: { 
        type: 'text' 
      },
      status: { 
        type: 'text', 
        default: 'pending',
        enum: ['pending', 'approved', 'spam'] 
      }
    }, {
      post_id: { foreignTable: 'posts', foreignKey: 'id' }
    }, {
      timestamps: true
    });

    console.log('✅ Comments table created');
  }

  async createAdminTable() {
    const tableExists = await this.checkTableExists('admin');
    if (tableExists) {
      console.log('📁 Admin table already exists');
      return;
    }

    await this.db.createTable('admin', {
      username: { 
        type: 'text', 
        unique: true,
        required: true 
      },
      password_hash: { 
        type: 'text', 
        required: true 
      },
      last_login: { 
        type: 'timestamp' 
      }
    }, {}, {
      encryption: {
        key: process.env.ENCRYPTION_KEY,
        fields: ['password_hash']
      }
    });

    console.log('✅ Admin table created');
  }

  async createTagsTable() {
    const tableExists = await this.checkTableExists('tags');
    if (tableExists) {
      console.log('📁 Tags table already exists');
      return;
    }

    await this.db.createTable('tags', {
      name: { 
        type: 'text', 
        unique: true,
        required: true 
      },
      slug: { 
        type: 'text', 
        unique: true,
        required: true 
      }
    });

    console.log('✅ Tags table created');
  }

  async createDefaultAdmin() {
    try {
      const adminUsers = await this.db.select('admin');
      if (adminUsers.length > 0) {
        console.log('👑 Admin user already exists');
        return;
      }

      const password = process.env.ADMIN_PASSWORD || 'admin123';
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      await this.db.insert('admin', {
        username: process.env.ADMIN_USERNAME || 'admin',
        password_hash: passwordHash
      });
      
      console.log('👑 Default admin user created');
      console.log(`   Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
      console.log(`   Password: ${password}`);
      console.log('⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
    } catch (error) {
      console.error('Error creating admin:', error);
    }
  }

  async createIndexes() {
    try {
      await this.db.addIndex('posts', 'slug', { type: 'hash', unique: true });
      await this.db.addIndex('posts', 'status', { type: 'hash' });
      await this.db.addIndex('posts', 'published_at', { type: 'value' });
      await this.db.addIndex('comments', 'post_id', { type: 'hash' });
      await this.db.addIndex('comments', 'status', { type: 'hash' });
      console.log('✅ Indexes created');
    } catch (error) {
      console.log('⚠️  Could not create indexes:', error.message);
    }
  }

  async checkTableExists(tableName) {
    try {
      await this.db.select(tableName, { limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Utility methods
  generateSlug(title) {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }) + '-' + Date.now();
  }

  async getPostBySlug(slug) {
    const posts = await this.db.select('posts', {
      where: { slug }
    });
    return posts[0] || null;
  }

  async getPublishedPosts(limit = 10, offset = 0) {
    return await this.db.select('posts', {
      where: { status: 'published' },
      orderBy: ['published_at', 'desc'],
      limit,
      offset
    });
  }

  async incrementPostViews(postId) {
    const post = await this.db.select('posts', { where: { id: postId } });
    if (post[0]) {
      await this.db.update('posts', 
        { views: (post[0].views || 0) + 1 }, 
        { id: postId }
      );
    }
  }
}

module.exports = new Database();