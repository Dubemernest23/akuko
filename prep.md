akuko/
├── Dapbase/                    # Database folder (auto-generated)
│   ├── dapbase.connection.js   # Import this in your code
│   ├── dapbase.config.json     # Configuration
│   └── akuko/                  # Your blog database
│       ├── users.table
│       ├── posts.table
│       ├── comments.table
│       ├── categories.table
│       ├── pages.table
│       └── settings.table
│
├── middleware/
│   └── auth.js                 # Authentication middleware
│
├── routes/
│   ├── public.js               # Public-facing routes
│   ├── auth.js                 # Login, register, logout
│   └── admin.js                # Admin panel routes
│
├── views/
│   ├── layout.ejs              # Main layout
│   ├── partials/               # Reusable components
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   ├── sidebar.ejs
│   │   └── flash.ejs
│   ├── public/                 # Public pages
│   │   ├── home.ejs
│   │   ├── post.ejs
│   │   ├── category.ejs
│   │   ├── search.ejs
│   │   └── page.ejs
│   ├── admin/                  # Admin pages
│   │   ├── dashboard.ejs
│   │   ├── profile.ejs
│   │   ├── posts/
│   │   │   ├── list.ejs
│   │   │   └── form.ejs
│   │   ├── comments/
│   │   │   └── list.ejs
│   │   └── categories/
│   │       └── list.ejs
│   ├── auth/                   # Auth pages
│   │   ├── login.ejs
│   │   ├── register.ejs
│   │   └── change-password.ejs
│   └── errors/
│       ├── 404.ejs
│       └── 500.ejs
│
├── public/                     # Static files
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── images/
│       └── default-avatar.png
│
├── uploads/                    # User uploads (create this folder)
│
├── .env                        # Environment variables
├── .env.example                # Example env file
├── .gitignore
├── app.js                      # Main application
├── setup.js                    # Database setup script
├── package.json
└── README.md