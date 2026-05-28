  // Load environment variables
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const passport = require("passport");


// Environment variables are loaded from .env file
// Make sure to create a .env file with all required variables

console.log('Environment variables loaded:', {
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  MONGO_URL: process.env.MONGO_URL ? 'SET' : 'NOT SET',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'
});

// Debug: Show actual values (without sensitive data)
console.log('🔍 Environment Debug:', {
  PORT: process.env.PORT,
  MONGO_URL: process.env.MONGO_URL ? process.env.MONGO_URL.substring(0, 20) + '...' : 'NOT SET',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'NOT SET'
});



require('./models/db');

// Passport configuration
require('./config/passport');

const financialAdviceRoutes = require("./routes/financialAdvice");
const businessTypesRoutes = require("./routes/businessTypes");
const addRoutes = require("./routes/add");
const communityRoutes = require('./routes/community');
const successStoriesRoutes = require("./routes/successStories")
const schemesRoutes = require("./routes/schemeRoutes");
const ocrRoutes = require("./routes/ocr");
const transactionsRouter = require('./routes/transactions');
const meetingsRoutes = require('./routes/meetings');
const authRoutes = require('./routes/authRoutes');
const voiceNavigationRoutes = require('./routes/voiceNavigation');
const { router: voiceAnalyticsRoutes } = require('./routes/voiceAnalytics');
const khataRoutes = require('./routes/khata');
const budgetRoutes = require('./routes/budget');

const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const PORT = process.env.PORT || 10000;

// Allow both local and production frontend URLs
const allowedOrigins = [
  // Frontend URLs
  "https://financial-advisor-own-5x5f-c63mrslex.vercel.app",
  "https://financial-advisor-own-5x5f-ghqt9r9vk.vercel.app",
  "https://financial-advisor-own-git-ea6ae2-aashish-suryawanshis-projects.vercel.app",
  "https://financial-advisor-own.vercel.app",
  // Backend URLs (for API-to-API calls if needed)
  "https://financial-advisor-own-5x5f.vercel.app",
  "https://financial-advisor-own-git-fresh-main-aashish-suryawanshis-projects.vercel.app",
  // Local development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5000",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:8080"
];

app.use(cors({
  origin: (origin, callback) => {
    console.log("🌐 Request Origin:", origin);
    
    // Allow requests with no origin (SSR, Postman, OAuth redirects, serverless)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list (normalize trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Also allow any vercel.app subdomain as fallback
    if (origin.endsWith('.vercel.app')) {
      console.log("✅ Allowing Vercel deployment:", origin);
      return callback(null, true);
    }
    
    console.log("❌ CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true
}));

// Increase payload size limit for handling large images/files (e.g., success stories with images)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/khata-proofs", express.static(require('os').tmpdir() + '/khata-proofs'));

// Passport middleware
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/financial-advice", financialAdviceRoutes);
app.use("/api/business-types", businessTypesRoutes);
app.use("/api/add", addRoutes);
app.use('/api/communities', communityRoutes);
app.use("/api/success-stories",successStoriesRoutes );
app.use("/api/schemes", schemesRoutes);
app.use("/api/ocr", ocrRoutes);
app.use('/api/transactions', transactionsRouter);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/voice-navigation', voiceNavigationRoutes);
app.use('/api/voice-analytics', voiceAnalyticsRoutes);
app.use('/api/khata', khataRoutes);
app.use('/api/budgets', budgetRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ 
    status: "running",
    message: "Financial Advisor API Server",
    endpoints: {
      auth: "/api/auth",
      financialAdvice: "/api/financial-advice",
      transactions: "/api/transactions",
      communities: "/api/communities",
      schemes: "/api/schemes",
      ocr: "/api/ocr"
    }
  });
});

app.get("/ping", (req, res) => {
  res.send("Hello Server");
});

// --- SOCKET.IO SETUP ---
const io = new Server(http, {
  cors: {
    origin: true, // Allow all origins for Socket.IO
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  socket.on('joinCommunity', (communityId) => {
    socket.join(communityId);
  });

  socket.on('sendMessage', (data) => {
    socket.to(data.communityId).emit('newMessage', data.message);
  });
});

app.set('io', io);

// Serve React frontend in production
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "../client/build")));
//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../client/build", "index.html"));
//   });
// }

http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add error handling for unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add error handling for the HTTP server
http.on('error', (error) => {
  console.error('❌ HTTP Server Error:', error);
});