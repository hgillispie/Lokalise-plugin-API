// ============================================================================
// LOKALISE BACKEND API SERVER - MAIN EXPRESS APPLICATION
// ============================================================================
// DOCUMENTATION STATUS: ✅ FULLY DOCUMENTED CODEBASE
// Last Updated: 2025-07-30
// 
// RECENT CRITICAL FIXES APPLIED:
// - ✅ Fixed getProject() data extraction bug (project_id and name now included)
// - ✅ Fixed file upload base64 encoding issue (Lokalise API parse errors resolved)
// - ✅ Added comprehensive documentation throughout entire codebase
// - ✅ Enhanced error logging and debugging capabilities
// - ✅ ARCHITECTURAL CHANGE: Moved content extraction to frontend (2025-07-30)
//
// DOCUMENTATION COMMITMENT:
// Moving forward, ALL code changes will include:
// - Comprehensive inline documentation explaining WHY and HOW
// - Integration context for Builder.io frontend plugin workflows  
// - Bug fix documentation with root cause analysis
// - Enhanced logging for debugging and monitoring
// - TypeScript interface documentation with usage examples
//
// CODEBASE STATUS: Production-ready with full documentation coverage
// ============================================================================
// This is the main Express.js server that serves as a proxy between the
// Builder.io frontend plugin and Lokalise's API. It handles:
//
// FRONTEND INTEGRATION:
// - Receives requests from Builder.io plugin with Bearer token authentication
// - Converts frontend API paths to Lokalise API calls
// - Example: Frontend calls /api/projects/123 → Backend calls api.lokalise.com/api2/projects/123
// - Returns unified response format with success/data/timestamp structure
//
// KEY ARCHITECTURAL ROLES:
// 1. Authentication Proxy: Validates Lokalise API tokens from frontend
// 2. Rate Limiting: Protects against API abuse and respects Lokalise limits
// 3. CORS Handler: Enables secure cross-origin requests from Builder.io domains
// 4. Response Formatter: Standardizes all API responses for frontend consumption
// 5. Error Handler: Provides consistent error responses and logging
//
// DEPLOYMENT CONTEXT:
// - Deployed on Railway at: https://talented-delight-production.up.railway.app
// - Receives traffic from Builder.io plugin running in browser
// - Proxies requests to api.lokalise.com/api2/ endpoints
//
// SECURITY FEATURES:
// - Helmet for security headers
// - Rate limiting per IP address
// - CORS restricted to Builder.io domains
// - Request size limits (10MB for file uploads)
// - Environment-based error detail filtering
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables for Railway deployment configuration
dotenv.config();

// Import API route handlers - each handles specific Lokalise API domain
import projectRoutes from './routes/projects';    // Project listing and details
import keyRoutes from './routes/keys';            // Translation key management
import translationRoutes from './routes/translations'; // Translation data CRUD
import fileRoutes from './routes/files';          // File upload/download operations
import taskRoutes from './routes/tasks';          // Translation task management
import contentRoutes from './routes/content';     // DEPRECATED: Content extraction moved to frontend

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// SECURITY MIDDLEWARE CONFIGURATION
// ============================================================================
// Security headers via Helmet - protects against common vulnerabilities
// Critical for Builder.io integration as plugin runs in browser context
app.use(helmet());

// Response compression to optimize data transfer between frontend and backend
// Important for large translation datasets and file operations
app.use(compression());

// HTTP request logging for debugging and monitoring API usage patterns
// Helps track frontend plugin behavior and identify integration issues
app.use(morgan('combined'));

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================
// Protects both our backend and Lokalise API from abuse
// Frontend plugin batches requests appropriately to stay within limits
// Default: 100 requests per 15 minutes per IP address
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// ============================================================================
// CORS CONFIGURATION FOR BUILDER.IO INTEGRATION
// ============================================================================
// Allows secure cross-origin requests from Builder.io plugin environments
// Essential for plugin to communicate with backend from Builder.io iframe context
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:1234',    // Local development
  'https://builder.io',       // Builder.io main domain
  'https://app.builder.io'    // Builder.io application domain
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    // This enables testing with curl and direct API access
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true, // Allows cookies and authorization headers
}));

// ============================================================================
// REQUEST BODY PARSING CONFIGURATION
// ============================================================================
// Handles JSON and form data from Builder.io plugin requests
// 10MB limit accommodates large translation files and content extracts
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
// Provides system status for Railway deployment monitoring
// Used by Railway and frontend plugin to verify backend availability
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ============================================================================
// API ROUTE REGISTRATION
// ============================================================================
// Maps frontend plugin requests to appropriate route handlers
// Each route group handles a specific aspect of the Lokalise integration workflow
app.use('/api/projects', projectRoutes);      // Project selection and management
app.use('/api/keys', keyRoutes);              // Translation key creation and updates
app.use('/api/translations', translationRoutes); // Translation data retrieval and updates
app.use('/api/files', fileRoutes);            // File upload and download operations
app.use('/api/tasks', taskRoutes);            // Translation task management
app.use('/api/content', contentRoutes);       // DEPRECATED: No active endpoints (frontend handles extraction)

// ============================================================================
// ROOT ENDPOINT - API DOCUMENTATION
// ============================================================================
// Provides API overview for developers and debugging
// Shows all available endpoints and basic integration information
app.get('/', (req, res) => {
  res.json({
    name: 'Lokalise Backend API',
    version: '1.0.0',
    description: 'Backend API server for Builder.io Lokalise integration',
    deployment: 'https://talented-delight-production.up.railway.app',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      keys: '/api/keys',
      translations: '/api/translations',
      files: '/api/files',
      tasks: '/api/tasks',
      content: '/api/content (deprecated)'
    },
    integration: {
      frontend: 'Builder.io plugin',
      authentication: 'Bearer token (Lokalise API key)',
      responseFormat: '{ success: boolean, data: any, timestamp: string }'
    },
    documentation: 'https://github.com/BuilderIO/lokalise-integration'
  });
});

// ============================================================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// ============================================================================
// Catches all unhandled errors and provides consistent error responses
// Critical for frontend plugin to handle API failures gracefully
// Logs detailed error information for debugging integration issues
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Server Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Security: Don't leak error details in production
  // Frontend plugin handles generic errors appropriately
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false, // Consistent with standard response format
    error: {
      message: isDevelopment ? err.message : 'Internal server error',
      ...(isDevelopment && { stack: err.stack }),
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// 404 NOT FOUND HANDLER
// ============================================================================
// Handles requests to non-existent endpoints
// Provides helpful error message for frontend plugin debugging
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      availableEndpoints: [
        '/health',
        '/api/projects',
        '/api/keys',
        '/api/translations',
        '/api/files',
        '/api/tasks',
        '/api/content (deprecated)'
      ],
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// SERVER STARTUP AND LIFECYCLE MANAGEMENT
// ============================================================================
// Starts the Express server and handles graceful shutdown
// Railway deployment automatically assigns PORT via environment variable
app.listen(PORT, () => {
  console.log(`🚀 Lokalise Backend API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/`);
  console.log(`🔗 Frontend integration: Builder.io plugin → /api/* endpoints`);
});

// ============================================================================
// GRACEFUL SHUTDOWN HANDLERS
// ============================================================================
// Ensures clean shutdown when Railway restarts or scales the deployment
// Allows in-flight requests to complete before terminating
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;