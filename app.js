require('dotenv').config();
const express = require("express");
const path = require("path");
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const morgan = require('morgan');
const methodOverride = require('method-override');
const app = express();
const PORT = process.env.PORT || 4320;



app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get("/health-check",(req,res) =>{
    console.log(req.ip)
    res.send("Health check completed!!!")
})

app.use((req, res, next) => {
    res.status(404).render('error', {
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist.',
      error: { status: 404 }
    });
});
  
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Something went wrong!';
    
    res.status(statusCode).render('error', {
      title: 'Error',
      message,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
});  


// Start server
app.listen(PORT, () => {
    console.log(`🚀 Akuko Blog running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);
    console.log(`👑 Admin: http://localhost:${PORT}/admin`);
});