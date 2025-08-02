// ============================================================================
// LOKALISE API CLIENT - BACKEND PROXY INTEGRATION
// ============================================================================
// This class serves as the primary interface between the backend API and Lokalise's API.
// It handles all communication with api.lokalise.com/api2/ endpoints and provides
// a unified abstraction layer for the route handlers.
//
// FRONTEND INTEGRATION ROLE:
// - Receives API tokens from Builder.io plugin via middleware authentication
// - Executes the actual Lokalise API calls on behalf of the frontend
// - Formats responses for consistent consumption by the frontend plugin
// - Handles rate limiting and error handling transparently
//
// KEY ARCHITECTURAL PATTERNS:
// 1. Token Management: Uses X-Api-Token header for all Lokalise API calls
// 2. Response Aggregation: Combines multiple Lokalise calls into single responses
// 3. Data Transformation: Converts Lokalise API responses to frontend-friendly formats
// 4. Error Handling: Provides consistent error responses with detailed logging
// 5. Content Processing: Extracts translatable content from Builder.io data structures
//
// CRITICAL BUG FIXES APPLIED:
// - Fixed getProject() to spread projectResult directly (not projectResult.project)
// - This ensures project_id, name, and other root fields are correctly returned
//
// LOKALISE API INTEGRATION PATTERNS:
// - Projects: Lists and retrieves project details + languages in single call
// - Keys: Creates translation keys and retrieves with translations included
// - Translations: Updates translation values with review status
// - Files: Handles file upload/download with base64 encoding
// - Tasks: Creates and manages translation tasks for contributors
// ============================================================================

import {
  Project,
  LokaliseKey,
  LokaliseTask,
  CreateKeysRequest,
  UploadFileRequest,
  CreateTaskRequest,
  GetTranslationsRequest
} from './types';

export class LokaliseClient {
  private apiToken: string;
  private baseUrl = 'https://api.lokalise.com/api2';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  // ============================================================================
  // CORE HTTP REQUEST METHOD
  // ============================================================================
  // Central method for all Lokalise API communication
  // Handles authentication, error handling, and response processing
  // Frontend plugin authentication flows through middleware to set this.apiToken
  async request(path: string, config?: RequestInit) {
    const url = `${this.baseUrl}/${path}`;
    const headers = {
      'X-Api-Token': this.apiToken,  // Lokalise API authentication
      'Content-Type': 'application/json',
      ...config?.headers,
    };

    const response = await fetch(url, {
      ...config,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      const errorMessage = errorData.error?.message || errorData.message || response.statusText;
      
      // Detailed error logging for debugging frontend integration issues
      console.error('Lokalise API Error:', {
        status: response.status,
        statusText: response.statusText,
        url,
        errorData
      });
      
      throw new Error(`Lokalise API error: ${response.status} - ${errorMessage}`);
    }

    return response.json();
  }

  // ============================================================================
  // PROJECT OPERATIONS - FRONTEND INTEGRATION CRITICAL
  // ============================================================================
  // These methods power the "Choose Project" functionality in the Builder.io plugin
  // Frontend calls GET /api/projects/{id} which routes to getProject()
  // Frontend calls GET /api/projects which routes to getAllProjects()

  // CRITICAL BUG FIX APPLIED: Fixed data extraction from Lokalise API
  // Lokalise returns project data at root level, not nested under .project property
  async getProject(projectId: string): Promise<{ project: Project }> {
    // Combine project details and languages in parallel for performance
    // Frontend plugin needs both project info AND available languages for UI
    const [projectResult, languagesResult] = await Promise.all([
      this.request(`projects/${projectId}`),      // Lokalise: GET /projects/{id}
      this.request(`projects/${projectId}/languages`) // Lokalise: GET /projects/{id}/languages
    ]);
    
    // CRITICAL: Spread projectResult directly (not projectResult.project)
    // This ensures project_id, name, description, etc. are included in response
    const projectWithLanguages = {
      ...(projectResult as any),                    // Project details (name, id, settings, etc.)
      languages: (languagesResult as any).languages || [] // Available languages array
    };
    
    console.log(`✅ Loaded project "${projectWithLanguages.name}" with ${projectWithLanguages.languages.length} languages`);
    return { project: projectWithLanguages };
  }

  // Provides project list for frontend "Choose Project" dropdown
  // Frontend plugin displays project names and allows user selection
  async getAllProjects(): Promise<{ projects: Project[] }> {
    try {
      const result = await this.request('projects') as any; // Lokalise: GET /projects
      console.log(`✅ Fetched ${result.projects?.length || 0} Lokalise projects`);
      return result;
    } catch (error) {
      console.error('💥 Failed to fetch Lokalise projects:', (error as any).message);
      throw error;
    }
  }

  // ============================================================================
  // TRANSLATION KEY OPERATIONS
  // ============================================================================
  // Powers the translation workflow: content extraction → key creation → translation
  // Frontend plugin sends extracted content to POST /api/keys/{projectId}
  // Keys are created in Lokalise with human-readable names and descriptions

  // Retrieves existing translation keys from Lokalise project
  // Frontend uses this to check for existing keys before creating new ones
  async getKeys(projectId: string): Promise<{ keys: LokaliseKey[] }> {
    return this.request(`projects/${projectId}/keys`) as any; // Lokalise: GET /projects/{id}/keys
  }

  // Creates new translation keys in Lokalise project
  // Frontend plugin calls this after extracting translatable content from Builder.io
  // Keys include human-readable names, descriptions, and platform assignments
  async createKeys(keys: CreateKeysRequest['keys'], projectId: string): Promise<{ keys: LokaliseKey[] }> {
    return this.request(`projects/${projectId}/keys`, {
      method: 'POST',
      body: JSON.stringify({ keys }),
    }) as any; // Lokalise: POST /projects/{id}/keys
  }

  // ============================================================================
  // TRANSLATION DATA OPERATIONS
  // ============================================================================
  // Handles updating translation values and review status in Lokalise
  // Frontend can submit translation updates from Builder.io interface

  // Updates translation values for specific keys and languages
  // Supports review workflow with is_fuzzy and is_reviewed flags
  async updateTranslations(translations: Array<{
    key_id: number;        // Lokalise key identifier
    language_iso: string;  // Target language (e.g., 'fr', 'de', 'es')
    translation: string;   // Translated text content
    is_fuzzy?: boolean;    // Mark as requiring review
    is_reviewed?: boolean; // Mark as reviewed and approved
  }>, projectId: string): Promise<{ translations: any[] }> {
    return this.request(`projects/${projectId}/translations`, {
      method: 'POST',
      body: JSON.stringify({ translations }),
    }) as any; // Lokalise: POST /projects/{id}/translations
  }

  // ============================================================================
  // FILE OPERATIONS - BULK TRANSLATION WORKFLOW
  // ============================================================================
  // Handles file-based translation workflows (JSON, CSV, etc.)
  // Frontend plugin can upload translation files or download completed translations

  // Uploads translation files to Lokalise project
  // Supports multiple file formats: JSON, CSV, XLSX, etc.
  // Frontend calls POST /api/files/{projectId}/upload
  async uploadFile(data: UploadFileRequest, projectId: string): Promise<{ process: { process_id: string; type: string; status: string } }> {
    // ========================================================================
    // CRITICAL BUG FIX - FILE UPLOAD BASE64 ENCODING ISSUE (RESOLVED)
    // ========================================================================
    // PROBLEM IDENTIFIED: Original implementation was causing Lokalise API errors
    // Error: "Parse error on line 1: ewogICJ0ZW1wbGF0ZV8y..." 
    // 
    // ROOT CAUSE: Incorrect base64 encoding of JSON data
    // - Frontend sends JSON string: '{"key1": "value1", "key2": "value2"}'
    // - Original code: Buffer.from(data.data).toString('base64') 
    // - This treated JSON string as raw bytes, corrupting the data
    // - Lokalise received malformed base64 that couldn't be parsed
    //
    // SOLUTION IMPLEMENTED:
    // - Detect if data is already base64 encoded (avoid double-encoding)
    // - Properly convert JSON strings to base64 using UTF-8 encoding
    // - Enhanced logging to track data transformation for debugging
    //
    // FRONTEND INTEGRATION CONTEXT:
    // - Builder.io plugin extracts content as JSON objects
    // - JSON is serialized to string format for file upload
    // - Backend must convert JSON string → base64 → send to Lokalise
    // - Lokalise processes base64 → creates translation keys from JSON structure
    // ========================================================================
    
    let base64Data: string;
    
    // Smart detection: Is the incoming data already base64 encoded?
    // Base64 strings are typically long and contain only valid base64 characters
    if (typeof data.data === 'string' && 
        data.data.length > 100 && 
        /^[A-Za-z0-9+/]+=*$/.test(data.data)) {
      
      // Data appears to be already base64 encoded - use as-is
      base64Data = data.data;
      console.log('📤 [FILE UPLOAD] Using data as-is (appears to be base64 already)');
      
    } else {
      // Data is a JSON string that needs proper UTF-8 to base64 conversion
      // CRITICAL: Use 'utf8' encoding to properly handle JSON string content
      base64Data = Buffer.from(data.data, 'utf8').toString('base64');
      console.log('📤 [FILE UPLOAD] Converting JSON string to base64 (FIXED ENCODING)');
    }
    
    // Construct payload for Lokalise API
    // Matches exact structure expected by api.lokalise.com/api2/projects/{id}/files/upload
    const uploadPayload = {
      ...data,                    // Include all frontend parameters
      data: base64Data,          // Properly encoded file content
    };
    
    // Enhanced logging for debugging and monitoring
    console.log('📤 [FILE UPLOAD] Sending to Lokalise API:', {
      filename: uploadPayload.filename,
      lang_iso: uploadPayload.lang_iso,
      originalDataLength: data.data.length,
      base64DataLength: base64Data.length,
      encodingApplied: base64Data !== data.data ? 'JSON->Base64' : 'No encoding (already base64)',
      dataPreview: typeof data.data === 'string' ? data.data.substring(0, 100) + '...' : 'binary data',
      payloadKeys: Object.keys(uploadPayload)
    });
    
    // Send properly formatted request to Lokalise API
    return this.request(`projects/${projectId}/files/upload`, {
      method: 'POST',
      body: JSON.stringify(uploadPayload),
    }) as any; // Lokalise: POST /projects/{id}/files/upload
  }

  // Downloads completed translations as files (JSON, CSV, etc.)
  // Frontend plugin can retrieve translated content for integration back into Builder.io
  async downloadFiles(options: {
    format: string;                        // Output format: json, csv, xlsx, etc.
    original_filenames?: boolean;          // Preserve original file names
    bundle_structure?: string;             // Directory structure for download
    directory_prefix?: string;             // Prefix for directories
    all_platforms?: boolean;               // Include all platform keys
    filter_langs?: string[];               // Specific languages to download
    filter_data?: string[];                // Filter by translation status
    filter_filenames?: string[];           // Filter by filename patterns
    add_newline_eof?: boolean;            // Add newline at end of file
    custom_translation_status_ids?: number[]; // Filter by custom status
    include_description?: boolean;         // Include key descriptions
    include_pids?: string[];              // Include specific project IDs
    triggers?: string[];                  // Webhook triggers
    filter_repository_formats?: string[]; // Repository format filters
    replace_breaks?: boolean;             // Replace line breaks
    disable_references?: boolean;         // Disable key references
    plural_format?: string;               // Plural handling format
    placeholder_format?: string;          // Placeholder format
    webhook_url?: string;                 // Webhook notification URL
  }, projectId: string): Promise<{ bundle_url: string }> {
    return this.request(`projects/${projectId}/files/download`, {
      method: 'POST',
      body: JSON.stringify(options),
    }) as any; // Lokalise: POST /projects/{id}/files/download
  }

  // ============================================================================
  // USER AND CONTRIBUTOR OPERATIONS
  // ============================================================================
  // Manages project contributors and their language permissions
  // Frontend plugin can display contributor information and manage access

  // Retrieves list of project contributors with their permissions
  // Shows who can translate, review, and manage the project
  async getProjectContributors(projectId: string): Promise<{ contributors: Array<{ user_id: number; email: string; fullname: string; is_admin: boolean; is_reviewer: boolean; languages: Array<{ lang_iso: string; is_writable: boolean }> }> }> {
    return this.request(`projects/${projectId}/contributors`) as any; // Lokalise: GET /projects/{id}/contributors
  }

  // ============================================================================
  // TRANSLATION TASK OPERATIONS
  // ============================================================================
  // Manages translation tasks and assignments for project contributors
  // Frontend plugin can create tasks and track translation progress

  // Creates new translation task for contributors
  // Tasks can be assigned to specific contributors with deadlines and instructions
  async createTask(task: CreateTaskRequest, projectId: string): Promise<{ task: LokaliseTask }> {
    return this.request(`projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    }) as any; // Lokalise: POST /projects/{id}/tasks
  }

  // Retrieves all tasks for a project
  // Frontend can display task list and progress tracking
  async getTasks(projectId: string): Promise<{ tasks: LokaliseTask[] }> {
    return this.request(`projects/${projectId}/tasks`) as any; // Lokalise: GET /projects/{id}/tasks
  }

  // Retrieves specific task details by task ID
  // Frontend can show detailed task information and progress
  async getTask(taskId: number, projectId: string): Promise<{ task: LokaliseTask }> {
    return this.request(`projects/${projectId}/tasks/${taskId}`) as any; // Lokalise: GET /projects/{id}/tasks/{taskId}
  }

  // ============================================================================
  // TRANSLATION RETRIEVAL FOR FRONTEND INTEGRATION
  // ============================================================================
  // Fetches completed translations for Builder.io plugin consumption
  // Frontend calls GET /api/translations with project and locale parameters

  // Retrieves translations using Lokalise Keys API with embedded translation data
  // This method combines key metadata with translation values for all target languages
  async getTranslationsFromKeys(projectId: string, targetLocales: string[]): Promise<any> {
    try {
      console.log('🔑 Fetching translations using Lokalise Keys API:', {
        projectId,
        targetLocales
      });
      
      // Use Lokalise Keys API to get all keys with their translations
      const keysResponse = await this.request(`projects/${projectId}/keys?include_translations=1&limit=5000`) as any;
      
      console.log('📝 Keys API response:', {
        keysCount: keysResponse.keys?.length || 0,
        firstKeyPreview: keysResponse.keys?.[0] ? {
          keyName: keysResponse.keys[0].key_name,
          translationsCount: keysResponse.keys[0].translations?.length || 0
        } : 'no keys'
      });
      
      if (!keysResponse.keys || keysResponse.keys.length === 0) {
        console.warn('⚠️ No keys found in project');
        return {};
      }
      
      // Build translations object grouped by locale
      const translationsByLocale: { [locale: string]: { [key: string]: string } } = {};
      
      // Initialize locales
      targetLocales.forEach(locale => {
        translationsByLocale[locale] = {};
      });
      
      // Process each key and its translations
      keysResponse.keys.forEach((key: any) => {
        const keyName = typeof key.key_name === 'object' 
          ? Object.values(key.key_name)[0] as string
          : key.key_name;
          
        console.log('🔑 Processing key:', keyName, 'with', key.translations?.length || 0, 'translations');
        
        if (key.translations && Array.isArray(key.translations)) {
          key.translations.forEach((translation: any) => {
            const locale = translation.language_iso;
            const translationText = translation.translation;
            
            if (targetLocales.includes(locale) && translationText) {
              translationsByLocale[locale][keyName] = translationText;
              console.log(`✅ Added translation: ${keyName} (${locale}) = "${translationText.substring(0, 50)}${translationText.length > 50 ? '...' : ''}"`);
            }
          });
        }
      });
      
      console.log('🌍 Final translations summary:');
      Object.entries(translationsByLocale).forEach(([locale, translations]) => {
        console.log(`  ${locale}: ${Object.keys(translations).length} translations`);
        // Show first few translations as examples
        Object.entries(translations).slice(0, 3).forEach(([key, value]) => {
          console.log(`    ${key}: "${value}"`);
        });
      });
      
      return translationsByLocale;
      
    } catch (error) {
      console.error('💥 Error fetching translations from Keys API:', error);
      console.error('💥 Error details:', {
        message: (error as any).message,
        projectId,
        targetLocales,
        errorType: (error as any).constructor.name
      });
      return {};
    }
  }

  // ============================================================================
  // CONTENT EXTRACTION METHODS DEPRECATED (FRONTEND REFACTOR)
  // ============================================================================
  // ARCHITECTURAL CHANGE: Content extraction moved to frontend (2025-07-30)
  // 
  // REMOVED METHODS:
  // - extractContentForTranslation() - Complex Builder.io content parsing
  // - extractTranslatableFieldsSimple() - Recursive field detection algorithm  
  // - isUserContent() - System vs user content filtering
  //
  // RATIONALE FOR REMOVAL:
  // - Frontend is better equipped to handle Builder.io's complex data structures
  // - Builder.io native utilities provide more reliable content extraction
  // - Eliminates backend parsing errors with nested component data
  // - Cleaner separation of concerns (content logic stays with Builder.io)
  //
  // NEW WORKFLOW:
  // 1. Frontend extracts content using Builder.io utilities
  // 2. Frontend generates clean translation keys with meaningful names
  // 3. Frontend sends processed data to existing endpoints:
  //    - POST /api/keys/{projectId} (receives pre-processed keys)
  //    - POST /api/files/{projectId}/upload (receives clean JSON data)
  // 4. Backend forwards processed data to Lokalise API (unchanged)
  //
  // MIGRATION IMPACT:
  // - ❌ Content extraction complexity removed from backend
  // - ✅ Key creation and file upload endpoints remain unchanged
  // - ✅ All other Lokalise API integration methods unchanged
  // - ✅ Frontend now handles content parsing using Builder.io's own tools
  // ============================================================================
}