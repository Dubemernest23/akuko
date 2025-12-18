akuko-blog/
├── 📁 config/                 # Configuration files
│   └── database.js           # Dapbase setup and schema
├── 📁 middleware/            # Custom middleware
│   ├── auth.js              # Authentication middleware
│   └── validation.js        # Input validation
├── 📁 models/               # Data models (if needed)
│   └── Post.js              # Post model with helper methods
├── 📁 routes/               # Express routes
│   ├── admin.js            # Admin routes (protected)
│   ├── posts.js            # Public post routes
│   ├── comments.js         # Comment routes
│   └── index.js            # Main route aggregator
├── 📁 public/               # Static assets
│   ├── css/                # Custom CSS (overrides)
│   │   └── custom.css
│   ├── js/                 # Frontend JavaScript
│   │   └── main.js
│   ├── images/             # Uploaded images
│   └── uploads/            # File uploads
├── 📁 views/               # EJS templates
│   ├── 📁 layouts/         # Layout templates
│   │   └── main.ejs        # Main layout
│   ├── 📁 partials/        # Reusable components
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   ├── navbar.ejs
│   │   └── flash.ejs       # Flash messages
│   ├── 📁 admin/           # Admin templates
│   │   ├── dashboard.ejs
│   │   ├── login.ejs
│   │   ├── posts/
│   │   │   ├── list.ejs
│   │   │   ├── create.ejs
│   │   │   └── edit.ejs
│   │   └── comments/
│   │       └── list.ejs
│   ├── home.ejs            # Homepage
│   ├── post.ejs            # Single post view
│   └── error.ejs           # Error page
├── 📁 utils/               # Utility functions
│   ├── helpers.js          # EJS helper functions
│   ├── slugify.js          # Slug generation
│   └── sanitize.js         # HTML sanitization
├── 📁 seeds/               # Seed data (optional)
│   └── initial-data.js
├── .env                    # Environment variables
├── .env.example            # Example env file
├── .gitignore
├── package.json
├── server.js              # Main Express app
├── setup.js               # Database setup script
└── README.md