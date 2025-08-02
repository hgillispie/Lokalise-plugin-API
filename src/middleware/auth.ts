// ============================================================================
// AUTHENTICATION MIDDLEWARE - BUILDER.IO PLUGIN INTEGRATION
// ============================================================================
// This middleware handles the critical authentication flow between the Builder.io 
// frontend plugin and the Lokalise API through our backend proxy.
//
// FRONTEND INTEGRATION FLOW:
// 1. User enters Lokalise API token in Builder.io plugin settings
// 2. Plugin stores token in localStorage and Builder.io settings
// 3. Plugin sends token with every API request via Authorization: Bearer header
// 4. This middleware validates token and creates LokaliseClient instance
// 5. Routes use req.lokaliseClient to make authenticated Lokalise API calls
//
// CRITICAL IMPLEMENTATION DETAILS:
// - Uses German spelling "projektId" intentionally (not a typo!)
// - Supports multiple token formats for flexibility (Bearer, X-Api-Token, etc.)
// - Extracts project ID from URL params, body, or query for route flexibility
// - Provides consistent error responses matching API response format
//
// SECURITY CONSIDERATIONS:
// - Token validation happens on every request to routes that use this middleware
// - No token persistence - stateless authentication per request
// - Error responses don't leak sensitive information
// - Supports environment fallback for development/testing
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { LokaliseClient } from '../lokalise-client';

// ============================================================================
// TYPESCRIPT INTERFACE EXTENSIONS
// ============================================================================
// Extends Express Request interface to include Lokalise integration properties
// These properties are set by middleware and used by route handlers
declare global {
  namespace Express {
    interface Request {
      lokaliseClient?: LokaliseClient; // Authenticated Lokalise API client instance
      projektId?: string;              // German spelling used intentionally throughout codebase
    }
  }
}

// ============================================================================
// PRIMARY AUTHENTICATION MIDDLEWARE
// ============================================================================
// Validates Lokalise API tokens from Builder.io plugin and creates client instances
// This middleware must be used on all routes that need Lokalise API access
// Frontend plugin sends token via Authorization: Bearer header

export const validateLokaliseToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ========================================================================
    // TOKEN EXTRACTION FROM MULTIPLE SOURCES
    // ========================================================================
    // Frontend plugin primarily uses Authorization: Bearer {token} format
    // Fallback options support different integration patterns and testing
    const authHeader = req.headers.authorization;
    const apiToken = req.headers['x-api-token'] as string ||              // Direct header
                     req.headers['lokalise-api-token'] as string ||       // Alternative header
                     (authHeader && authHeader.startsWith('Bearer ') ?    // Bearer token (primary)
                       authHeader.slice(7) : null) ||
                     process.env.LOKALISE_API_TOKEN;                      // Environment fallback

    if (!apiToken) {
      return res.status(401).json({
        success: false,  // Consistent with API response format
        error: {
          message: 'Missing Lokalise API token. Provide via Authorization header, X-Api-Token header, or Lokalise-Api-Token header.',
          details: 'Builder.io plugin should send: Authorization: Bearer {your-lokalise-token}',
          timestamp: new Date().toISOString()
        }
      });
    }

    // ========================================================================
    // LOKALISE CLIENT INSTANCE CREATION
    // ========================================================================
    // Create authenticated client instance for this request
    // Client will be used by route handlers to make Lokalise API calls
    const lokaliseClient = new LokaliseClient(apiToken);
    
    // Attach authenticated client to request object
    // Route handlers access via: req.lokaliseClient.getProject(), etc.
    req.lokaliseClient = lokaliseClient;

    // ========================================================================
    // PROJECT ID EXTRACTION AND ATTACHMENT
    // ========================================================================
    // Extract project ID from URL parameters, request body, or query string
    // Frontend plugin includes project ID in API calls for context
    const projectId = req.params.projectId ||      // URL parameter (most common)
                      req.body.projectId ||         // Request body
                      req.query.projectId as string || // Query parameter
                      process.env.LOKALISE_PROJECT_ID; // Environment fallback
    
    if (projectId) {
      // IMPORTANT: German spelling "projektId" used intentionally throughout codebase
      // This is not a typo - it's a deliberate architectural decision
      req.projektId = projectId;
    }

    next(); // Proceed to route handler
  } catch (error) {
    console.error('💥 Authentication error:', error);
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid Lokalise API token',
        details: 'Token may be expired, invalid, or lack required permissions',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// ============================================================================
// PROJECT ID REQUIREMENT MIDDLEWARE
// ============================================================================
// Ensures that routes requiring a Lokalise project ID have one available
// Used on endpoints that operate on specific projects (most of our API)
// Frontend plugin includes project ID in URL path: /api/projects/{projectId}

export const requireProjectId = (req: Request, res: Response, next: NextFunction) => {
  // ========================================================================
  // PROJECT ID EXTRACTION FROM MULTIPLE SOURCES
  // ========================================================================
  // Check URL parameters first (primary source from frontend plugin)
  // Fallback to request body, query params, and previous middleware results
  const projectId = req.params.projectId ||          // URL path parameter (primary)
                    req.body.projectId ||             // Request body
                    req.query.projektId as string ||  // Query parameter (note German spelling)
                    req.projektId ||                  // Set by previous middleware
                    process.env.LOKALISE_PROJECT_ID;  // Environment fallback

  if (!projectId) {
    return res.status(400).json({
      success: false,  // Consistent with API response format
      error: {
        message: 'Project ID is required. Provide via URL parameter, request body, or query parameter.',
        details: 'Frontend plugin should call: /api/projects/{projectId} or include projectId in request body',
        expectedFormats: [
          'URL: /api/projects/{projectId}',
          'Body: { "projectId": "your-project-id" }',
          'Query: ?projektId=your-project-id'
        ],
        timestamp: new Date().toISOString()
      }
    });
  }

  // Store project ID using German spelling convention
  // This ensures consistency across the entire backend codebase
  req.projektId = projectId;
  next(); // Proceed to route handler
};