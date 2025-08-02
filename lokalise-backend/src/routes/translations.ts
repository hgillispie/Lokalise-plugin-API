// ============================================================================
// TRANSLATIONS ROUTES - COMPLETED TRANSLATION RETRIEVAL AND UPDATES
// ============================================================================
// These endpoints handle the retrieval of completed translations from Lokalise
// and support updating translation values and review status.
//
// FRONTEND INTEGRATION WORKFLOW:
// 1. Content extracted and keys created in Lokalise
// 2. Translators complete translations in Lokalise dashboard  
// 3. Frontend calls POST /api/translations/{projectId}/fetch to retrieve completed translations
// 4. Frontend integrates translated content back into Builder.io
// 5. Optional: Frontend can update translation values via POST /api/translations/{projectId}/update
//
// CRITICAL ENDPOINTS:
// - POST /api/translations/{projectId}/fetch: Retrieve completed translations by locale
// - POST /api/translations/{projectId}/update: Update translation values and review status
//
// RESPONSE FORMAT:
// Translations are returned grouped by locale:
// {
//   "en": { "homepage.title": "Welcome", "homepage.subtitle": "Get started" },
//   "fr": { "homepage.title": "Bienvenue", "homepage.subtitle": "Commencer" }
// }
// ============================================================================

import express from 'express';
import { validateLokaliseToken, requireProjectId } from '../middleware/auth';
import { validateGetTranslations } from '../middleware/validation';

const router = express.Router();

// ============================================================================
// POST /api/translations/{projectId}/fetch - RETRIEVE COMPLETED TRANSLATIONS
// ============================================================================
// FRONTEND INTEGRATION: Primary endpoint for getting translated content for Builder.io
// USER WORKFLOW: Called when plugin needs to display translated content
// INPUT: Array of target language codes (e.g., ["fr", "de", "es"])
// OUTPUT: Translations grouped by locale with key-value pairs

router.post('/:projectId/fetch', validateLokaliseToken, requireProjectId, validateGetTranslations, async (req, res) => {
  try {
    const projectId = req.projektId!;
    const { targetLocales } = req.body;
    
    console.log(`🌍 Fetching translations for project ${projectId}, locales: ${targetLocales.join(', ')}`);
    
    const result = await req.lokaliseClient!.getTranslationsFromKeys(projectId, targetLocales);
    
    // Count total translations
    const translationCounts = Object.entries(result).reduce((acc, [locale, translations]) => {
      acc[locale] = Object.keys(translations as object).length;
      return acc;
    }, {} as { [locale: string]: number });
    
    console.log(`✅ Fetched translations:`, translationCounts);
    
    res.json({
      success: true,
      data: result,
      counts: translationCounts,
      targetLocales,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching translations:', error);
    res.status(500).json({
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ============================================================================
// POST /api/translations/{projectId}/update - UPDATE TRANSLATION VALUES
// ============================================================================
// FRONTEND INTEGRATION: Allows plugin to update translation values and review status
// USER WORKFLOW: Called when users make translation edits through Builder.io interface
// USE CASES: Bulk updates, review workflow management, translation corrections
// INPUT: Array of translation objects with key_id, language_iso, translation text, and status

router.post('/:projectId/update', validateLokaliseToken, requireProjectId, async (req, res) => {
  try {
    const projectId = req.projektId!;
    const { translations } = req.body;
    
    if (!translations || !Array.isArray(translations) || translations.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Translations array is required and must contain at least one translation',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    console.log(`📝 Updating ${translations.length} translations in project ${projectId}`);
    
    const result = await req.lokaliseClient!.updateTranslations(translations, projectId);
    
    console.log(`✅ Successfully updated ${result.translations?.length || 0} translations`);
    
    res.json({
      success: true,
      data: result,
      updated: result.translations?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error updating translations:', error);
    res.status(500).json({
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;