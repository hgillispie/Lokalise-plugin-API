import { Request, Response, NextFunction } from 'express';

export const validateCreateKeys = (req: Request, res: Response, next: NextFunction) => {
  const { keys } = req.body;

  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({
      error: {
        message: 'Keys array is required and must contain at least one key',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Validate each key object
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key.key_name || typeof key.key_name !== 'string') {
      return res.status(400).json({
        error: {
          message: `Key at index ${i} must have a valid key_name string`,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  next();
};

export const validateUploadFile = (req: Request, res: Response, next: NextFunction) => {
  const { data, filename, lang_iso } = req.body;

  if (!data || typeof data !== 'string') {
    return res.status(400).json({
      error: {
        message: 'File data is required and must be a string',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({
      error: {
        message: 'Filename is required and must be a string',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (!lang_iso || typeof lang_iso !== 'string') {
    return res.status(400).json({
      error: {
        message: 'Language ISO code (lang_iso) is required and must be a string',
        timestamp: new Date().toISOString()
      }
    });
  }

  next();
};

export const validateCreateTask = (req: Request, res: Response, next: NextFunction) => {
  const { title, languages } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({
      error: {
        message: 'Title is required and must be a string',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (!languages || !Array.isArray(languages) || languages.length === 0) {
    return res.status(400).json({
      error: {
        message: 'Languages array is required and must contain at least one language',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Validate each language object
  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i];
    if (!lang.language_iso || typeof lang.language_iso !== 'string') {
      return res.status(400).json({
        error: {
          message: `Language at index ${i} must have a valid language_iso string`,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (!lang.users || !Array.isArray(lang.users) || lang.users.length === 0) {
      return res.status(400).json({
        error: {
          message: `Language at index ${i} must have a users array with at least one user ID`,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  next();
};

// ============================================================================
// CONTENT EXTRACTION VALIDATION REMOVED (FRONTEND REFACTOR)
// ============================================================================
// The validateExtractContent middleware has been removed as part of moving
// content extraction logic to the frontend. The middleware was only used by
// the deprecated /api/content/extract endpoint.
//
// REMOVED: validateExtractContent() - validated Builder.io content objects
// REASON: Content extraction now handled by frontend using Builder.io utilities
// DATE: 2025-07-30
// ============================================================================

export const validateGetTranslations = (req: Request, res: Response, next: NextFunction) => {
  const { targetLocales } = req.body;
  const projectId = req.params.projectId || req.body.projectId || req.query.projectId;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({
      error: {
        message: 'Project ID is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (!targetLocales || !Array.isArray(targetLocales) || targetLocales.length === 0) {
    return res.status(400).json({
      error: {
        message: 'Target locales array is required and must contain at least one locale',
        timestamp: new Date().toISOString()
      }
    });
  }

  next();
};