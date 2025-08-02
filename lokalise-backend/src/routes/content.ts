// ============================================================================
// CONTENT ROUTES - DEPRECATED (FRONTEND EXTRACTION REFACTOR)
// ============================================================================
// ARCHITECTURAL CHANGE: Content extraction moved to frontend
// Date: 2025-07-30
//
// PREVIOUS APPROACH (REMOVED):
// - Backend parsed Builder.io content objects (complex, error-prone)
// - POST /api/content/extract endpoint handled raw Builder.io data
// - POST /api/content/extract-batch for bulk processing
// - Backend generated translation keys from nested component data
//
// NEW APPROACH (CURRENT):
// - Frontend handles content extraction using Builder.io native utilities
// - Frontend generates clean translation keys with meaningful names
// - Frontend sends pre-processed data directly to:
//   * POST /api/keys/{projectId} - Create translation keys
//   * POST /api/files/{projectId}/upload - Upload source files
//
// BENEFITS OF FRONTEND EXTRACTION:
// - More reliable parsing using Builder.io's own utilities
// - Eliminates backend parsing errors with complex nested data
// - Cleaner separation of concerns
// - Better key naming based on actual content context
//
// MIGRATION IMPACT:
// - ❌ /api/content/extract endpoint removed
// - ❌ /api/content/extract-batch endpoint removed
// - ✅ /api/keys/{projectId} remains unchanged (receives pre-processed keys)
// - ✅ /api/files/{projectId}/upload remains unchanged (receives clean JSON)
// - ✅ All other endpoints (projects, translations, tasks) unchanged
//
// FRONTEND WORKFLOW (NEW):
// 1. User publishes content in Builder.io CMS
// 2. Frontend plugin extracts content using Builder.io utilities
// 3. Frontend generates human-readable translation keys
// 4. Frontend sends processed keys to POST /api/keys/{projectId}
// 5. Backend forwards keys to Lokalise API
// ============================================================================

import express from 'express';

const router = express.Router();

// ============================================================================
// CONTENT EXTRACTION ENDPOINTS DEPRECATED
// ============================================================================
// These endpoints have been removed as part of the frontend extraction refactor.
// Content extraction is now handled entirely by the frontend using Builder.io
// native utilities for more reliable and accurate parsing.

// No routes defined - content extraction moved to frontend
// Frontend now sends pre-processed data to /api/keys and /api/files endpoints

export default router;