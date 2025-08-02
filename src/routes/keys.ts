// ============================================================================
// TRANSLATION KEY ROUTES - CORE TRANSLATION WORKFLOW ENDPOINTS
// ============================================================================
// These endpoints manage the creation and retrieval of translation keys in Lokalise.
// They form the bridge between content extraction and actual translation work.
//
// CRITICAL TRANSLATION WORKFLOW:
// 1. Content extracted from Builder.io → POST /api/content/extract
// 2. Generated keys sent to Lokalise → POST /api/keys/{projectId}
// 3. Translators work on keys in Lokalise dashboard
// 4. Frontend retrieves completed translations → GET /api/keys/{projectId}/with-translations
// 5. Translated content integrated back into Builder.io
//
// ENDPOINT PURPOSES:
// - GET /api/keys/{projectId}: List existing translation keys (check for duplicates)
// - POST /api/keys/{projectId}: Create new translation keys from extracted content
// - GET /api/keys/{projectId}/with-translations: Retrieve completed translations
//
// FRONTEND INTEGRATION PATTERNS:
// - Keys endpoint called after content extraction to create translation tasks
// - Translation endpoint called to fetch completed translations for Builder.io integration
// - All endpoints require project context and Lokalise API authentication
// ============================================================================

import express from 'express';
import { validateLokaliseToken, requireProjectId } from '../middleware/auth';
import { validateCreateKeys } from '../middleware/validation';

const router = express.Router();

// ============================================================================
// GET /api/keys/{projectId} - LIST PROJECT TRANSLATION KEYS
// ============================================================================
// FRONTEND INTEGRATION: Check existing keys before creating new ones
// USER WORKFLOW: Plugin can display existing translation keys and avoid duplicates
// USE CASE: Prevents duplicate key creation when content is re-processed

router.get('/:projectId', validateLokaliseToken, requireProjectId, async (req, res) => {
  try {
    const projectId = req.projektId!;
    
    // Fetch all translation keys from Lokalise project
    // Returns: { keys: [{ key_id, key_name, description, translations, ... }] }
    const result = await req.lokaliseClient!.getKeys(projectId);
    
    res.json({
      success: true,
      data: result,              // Array of translation keys with metadata
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching keys:', error);
    res.status(500).json({
      success: false,
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ============================================================================
// GET /api/keys/{projectId}/with-translations - RETRIEVE COMPLETED TRANSLATIONS
// ============================================================================
// FRONTEND INTEGRATION: Fetches completed translations for Builder.io content integration
// USER WORKFLOW: Plugin calls this to get translated content for display in Builder.io
// QUERY PARAMETERS: ?locales=en,fr,de (comma-separated language codes)
// RESPONSE: Object with translations grouped by locale: { en: {...}, fr: {...} }

router.get('/:projectId/with-translations', validateLokaliseToken, requireProjectId, async (req, res) => {
  try {
    const projectId = req.projektId!;
    
    // Get target locales from query parameters
    const targetLocales = req.query.locales ? 
      (req.query.locales as string).split(',') : 
      [];
    
    if (targetLocales.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Target locales are required. Provide as comma-separated query parameter: ?locales=en,fr,de',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const result = await req.lokaliseClient!.getTranslationsFromKeys(projectId, targetLocales);
    
    res.json({
      success: true,
      data: result,
      targetLocales,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching keys with translations:', error);
    res.status(500).json({
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ============================================================================
// POST /api/keys/{projectId} - CREATE TRANSLATION KEYS IN LOKALISE
// ============================================================================
// FRONTEND INTEGRATION: Creates Lokalise keys from Builder.io content extraction results
// USER WORKFLOW: Called immediately after POST /api/content/extract to send keys to Lokalise
// INPUT: Array of key objects with human-readable names and descriptions
// OUTPUT: Created keys with Lokalise IDs for tracking and updates
//
// REQUEST BODY STRUCTURE:
// {
//   keys: [
//     {
//       key_name: "homepage.hero_title",
//       description: "Homepage Hero Section - Title text",
//       platforms: ["web"]
//     }
//   ]
// }

router.post('/:projectId', validateLokaliseToken, requireProjectId, validateCreateKeys, async (req, res) => {
  try {
    const projectId = req.projektId!;
    const { keys } = req.body;
    
    console.log(`📝 Creating ${keys.length} keys in project ${projectId}`);
    
    const result = await req.lokaliseClient!.createKeys(keys, projectId);
    
    console.log(`✅ Successfully created ${result.keys?.length || 0} keys`);
    
    res.json({
      success: true,
      data: result,
      created: result.keys?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error creating keys:', error);
    res.status(500).json({
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;