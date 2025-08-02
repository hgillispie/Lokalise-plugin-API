// ============================================================================
// TYPESCRIPT TYPE DEFINITIONS - LOKALISE API INTEGRATION
// ============================================================================
// This file defines TypeScript interfaces that ensure type safety across the entire
// backend integration with Lokalise API and Builder.io plugin communication.
//
// TYPE DEFINITION SOURCES:
// - Extracted from Lokalise API documentation and response analysis
// - Aligned with Builder.io plugin data structures for seamless integration
// - Extended to support backend-specific workflow requirements
//
// INTEGRATION ARCHITECTURE:
// 1. API Response Types: Match Lokalise API JSON response structures exactly
// 2. Request Types: Define expected input from Builder.io plugin requests
// 3. Internal Types: Support content processing and workflow management
// 4. Frontend Compatibility: Ensure type consistency with plugin TypeScript
//
// CRITICAL DESIGN DECISIONS:
// - Project interface includes combined project + languages data structure
// - Key interfaces support both object and string key_name formats (Lokalise API variation)
// - Task interfaces include full user and language assignment details
// - Request types include optional projectId for flexible endpoint design
//
// USAGE PATTERNS:
// - Route handlers use these types for request/response validation
// - LokaliseClient methods return these typed interfaces
// - Middleware and validation logic reference these types
// - Frontend plugin expects responses matching these interface structures
// ============================================================================

// ============================================================================
// LOKALISE PROJECT DATA STRUCTURE  
// ============================================================================
// Represents a Lokalise project with combined project metadata and language information
// Frontend plugin displays this data in "Choose Project" UI and language selection
// CRITICAL: This interface includes languages array from separate API call aggregation

export interface Project {
  project_id: string;        // Unique Lokalise project identifier
  project_type: string;      // Project type (localization_files, etc.)
  name: string;              // Human-readable project name (displayed in frontend)
  description: string;       // Project description
  created_at: string;        // Project creation timestamp
  created_by: number;        // Creator user ID
  team_id: number;           // Lokalise team identifier
  base_language_id: number;  // Base language numeric ID
  base_language_iso: string; // Base language ISO code (e.g., 'en', 'de')
  settings: {
    per_platform_key_names: boolean; // Platform-specific key naming
    reviewing: boolean;               // Review workflow enabled
    upvoting: boolean;               // Translation voting enabled
  };
  statistics: {
    progress_total: number;    // Overall translation progress percentage
    keys_total: number;        // Total number of translation keys
    team: number;             // Team member count
    base_words: number;       // Word count in base language
    qa_issues_total: number;  // Quality assurance issues count
  };
  // CRITICAL: Combined from separate /languages API call in LokaliseClient.getProject()
  languages: Array<{
    lang_id: number;      // Lokalise language ID
    lang_iso: string;     // ISO language code
    lang_name: string;    // Human-readable language name
    is_rtl: boolean;      // Right-to-left text direction
    plural_forms: string[]; // Plural form rules for this language
  }>;
}

// ============================================================================
// TRANSLATION KEY DATA STRUCTURE
// ============================================================================
// Represents a single translation key with all associated translations and metadata
// Frontend plugin creates these keys from Builder.io content extraction
// Includes full translation history, review status, and contributor information

export interface LokaliseKey {
  key_id: number;
  key_name: object | string;
  filenames: object;
  description: string;
  platforms: string[];
  tags: string[];
  comments: Array<{
    comment: string;
    added_by: number;
    added_by_email: string;
    added_at: string;
  }>;
  screenshots: Array<{
    screenshot_id: number;
    url: string;
    title: string;
  }>;
  translations: Array<{
    translation_id: number;
    key_id: number;
    language_iso: string;
    translation: string;
    is_reviewed: boolean;
    reviewed_by: number;
    is_unverified: boolean;
    is_fuzzy: boolean;
    is_hidden: boolean;
    modified_at: string;
    modified_by: number;
    modified_by_email: string;
  }>;
  created_at: string;
  modified_at: string;
}

// ============================================================================
// TRANSLATION TASK DATA STRUCTURE
// ============================================================================
// Represents a translation task assigned to contributors with deadlines and progress tracking
// Frontend plugin can create tasks and monitor completion status
// Supports complex assignment workflows with multiple languages and contributors

export interface LokaliseTask {
  task_id: number;
  title: string;
  description: string;
  status: string;
  progress: number;
  due_date: string;
  keys_count: number;
  words_count: number;
  created_at: string;
  created_by: number;
  created_by_email: string;
  can_be_parent: boolean;
  task_type: string;
  parent_task_id: number;
  closing_tags: string[];
  do_lock_translations: boolean;
  languages: Array<{
    language_iso: string;
    users: Array<{
      user_id: number;
      email: string;
      fullname: string;
    }>;
  }>;
  auto_close_languages: boolean;
  auto_close_task: boolean;
  completed_at: string;
  completed_by: number;
  completed_by_email: string;
}

// ============================================================================
// CONTENT EXTRACTION RESULT - DEPRECATED (FRONTEND REFACTOR)
// ============================================================================
// DEPRECATED: Content extraction moved to frontend (2025-07-30)
// This interface was used when backend handled Builder.io content parsing
// Frontend now handles extraction using Builder.io utilities directly

export interface ContentExtractionResult {
  keys: Array<{
    key_name: string;
    description?: string;
    platforms?: string[];
  }>;
  jsonData: { [key: string]: any };
}

// ============================================================================
// API REQUEST/RESPONSE TYPES - FRONTEND PLUGIN INTEGRATION
// ============================================================================
// These types define the contract between the Builder.io plugin and backend API
// Each request type corresponds to specific endpoint functionality
// Response types ensure consistent data format for frontend consumption

// DEPRECATED: Request to extract translatable content from Builder.io objects
// This was used by the removed POST /api/content/extract endpoint
// Content extraction now handled by frontend using Builder.io utilities
export interface ExtractContentRequest {
  content: any;
  entryName?: string;
  projectId?: string;
}

// Request to create new translation keys in Lokalise project
// Frontend plugin calls POST /api/keys/{projectId} after content extraction
export interface CreateKeysRequest {
  keys: Array<{
    key_name: string;
    description?: string;
    platforms?: string[];
    filenames?: object;
    tags?: string[];
  }>;
  projectId?: string;
}

// Request to upload translation files to Lokalise project
// Frontend plugin calls POST /api/files/{projectId}/upload for bulk operations
export interface UploadFileRequest {
  data: string;
  filename: string;
  lang_iso: string;
  convert_placeholders?: boolean;
  detect_icu_plurals?: boolean;
  hidden_from_contributors?: boolean;
  cleanup_mode?: boolean;
  custom_translation_status_ids?: number[];
  projectId?: string;
}

// Request to create translation tasks for project contributors
// Frontend plugin calls POST /api/tasks/{projectId} to assign work
export interface CreateTaskRequest {
  title: string;
  description?: string;
  due_date?: string;
  keys?: number[];
  languages: Array<{
    language_iso: string;
    users: number[];
  }>;
  auto_close_languages?: boolean;
  auto_close_task?: boolean;
  task_type?: string;
  parent_task_id?: number;
  closing_tags?: string[];
  do_lock_translations?: boolean;
  projectId?: string;
}

// Request to retrieve completed translations for specific languages
// Frontend plugin calls GET /api/translations with query parameters
export interface GetTranslationsRequest {
  projectId: string;
  targetLocales: string[];
}