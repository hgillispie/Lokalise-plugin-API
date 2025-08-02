// ============================================================================
// FILE ROUTES - BULK TRANSLATION FILE OPERATIONS
// ============================================================================
// These endpoints handle file-based translation workflows for bulk operations.
// They complement the key-based approach with support for traditional translation files.
//
// FRONTEND INTEGRATION WORKFLOW:
// 1. Plugin exports Builder.io content as translation files (JSON, CSV, etc.)
// 2. Files uploaded to Lokalise via POST /api/files/{projectId}/upload
// 3. Translators work on files in Lokalise dashboard
// 4. Completed files downloaded via LokaliseClient.downloadFiles()
// 5. Translated files processed and integrated back into Builder.io
//
// FILE FORMAT SUPPORT:
// - JSON: Structured key-value translation files
// - CSV: Spreadsheet-compatible translation data
// - XLSX: Excel files for non-technical translators
// - Various other formats supported by Lokalise API
//
// USE CASES:
// - Bulk translation projects with large content volumes
// - Integration with external translation tools
// - Offline translation workflows
// - Legacy system migrations
// ============================================================================

import express from 'express';
import { validateLokaliseToken, requireProjectId } from '../middleware/auth';
import { validateUploadFile } from '../middleware/validation';

const router = express.Router();

// ============================================================================
// POST /api/files/{projectId}/upload - UPLOAD TRANSLATION FILES TO LOKALISE
// ============================================================================
// FRONTEND INTEGRATION: Supports bulk translation workflows via file uploads
// USER WORKFLOW: Plugin exports content as files and uploads for translation
// FILE PROCESSING: Lokalise processes files and creates/updates translation keys
// SUPPORTED FORMATS: JSON, CSV, XLSX, and other Lokalise-supported formats
//
// CRITICAL BUG FIX APPLIED (RESOLVED):
// - Fixed base64 encoding issue in LokaliseClient.uploadFile() method
// - Frontend sends JSON strings, backend now properly converts to base64
// - Added comprehensive logging for debugging future file upload issues
// - Error "Parse error on line 1: ewogICJ0ZW1wbGF0ZV8y..." is now resolved
//
// EXPECTED REQUEST PAYLOAD FROM FRONTEND:
// {
//   "data": "{\"key1\": \"value1\", \"key2\": \"value2\"}",  // JSON string
//   "filename": "content_source.json",
//   "lang_iso": "en",
//   "convert_placeholders": true,
//   "detect_icu_plurals": true
// }
//
// LOKALISE API RECEIVES (after backend processing):
// {
//   "data": "eyJrZXkxIjogInZhbHVlMSIsICJrZXkyIjogInZhbHVlMiJ9",  // base64
//   "filename": "content_source.json",
//   "lang_iso": "en",
//   "convert_placeholders": true,
//   "detect_icu_plurals": true
// }

router.post('/:projectId/upload', validateLokaliseToken, requireProjectId, validateUploadFile, async (req, res) => {
  try {
    const projektId = req.projektId!;
    const fileData = req.body;
    
    console.log(`📤 [FILE UPLOAD] Starting upload for project ${projektId}`);
    console.log(`📋 [FILE UPLOAD] Request payload:`, {
      filename: fileData.filename,
      lang_iso: fileData.lang_iso,
      dataType: typeof fileData.data,
      dataLength: fileData.data?.length || 0,
      dataPreview: typeof fileData.data === 'string' ? fileData.data.substring(0, 200) + '...' : 'non-string data',
      convert_placeholders: fileData.convert_placeholders,
      detect_icu_plurals: fileData.detect_icu_plurals,
      allKeys: Object.keys(fileData)
    });
    
    const result = await req.lokaliseClient!.uploadFile(fileData, projektId);
    
    console.log(`✅ [FILE UPLOAD] File uploaded successfully:`, {
      process_id: result.process?.process_id,
      status: result.process?.status,
      type: result.process?.type
    });
    
    res.json({
      success: true,
      data: result,
      process_id: result.process?.process_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 [FILE UPLOAD] Error uploading file:', error);
    console.error('💥 [FILE UPLOAD] Error details:', {
      message: (error as any).message,
      stack: (error as any).stack,
      projektId: req.projektId,
      filename: req.body?.filename,
      dataType: typeof req.body?.data,
      dataLength: req.body?.data?.length || 0
    });
    res.status(500).json({
      success: false,
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Download files from Lokalise
router.post('/:projectId/download', validateLokaliseToken, requireProjectId, async (req, res) => {
  try {
    const projektId = req.projektId!;
    const downloadOptions = req.body;
    
    // Set default download options if not provided
    const options = {
      format: 'json',
      original_filenames: true,
      ...downloadOptions
    };
    
    console.log(`📥 Downloading files from project ${projektId}:`, options);
    
    const result = await req.lokaliseClient!.downloadFiles(options, projektId);
    
    console.log(`✅ Download initiated:`, {
      bundle_url: result.bundle_url
    });
    
    res.json({
      success: true,
      data: result,
      bundle_url: result.bundle_url,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error downloading files:', error);
    res.status(500).json({
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;