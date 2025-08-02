// ============================================================================
// PROJECT ROUTES - FRONTEND PLUGIN INTEGRATION ENDPOINTS
// ============================================================================
// These endpoints power the "Choose Project" functionality in the Builder.io plugin
// and provide project metadata essential for the translation workflow.
//
// FRONTEND INTEGRATION WORKFLOW:
// 1. Plugin loads: Calls GET /api/projects to populate project dropdown
// 2. User selects project: Calls GET /api/projects/{id} to load project details + languages
// 3. Plugin displays: Project name, available languages, and translation statistics
// 4. Contributor management: Optional GET /api/projects/{id}/contributors for team info
//
// CRITICAL ENDPOINTS:
// - GET /api/projects: Lists all accessible projects (project selection UI)
// - GET /api/projects/{id}: Gets project details + languages (FIXED: ensures project_id included)
// - GET /api/projects/{id}/contributors: Gets team members and permissions
//
// AUTHENTICATION FLOW:
// - All endpoints require validateLokaliseToken middleware
// - Token from Builder.io plugin → middleware creates LokaliseClient → routes use client
// - Project-specific endpoints require requireProjectId middleware
//
// RESPONSE FORMAT:
// All endpoints return: { success: boolean, data: any, timestamp: string }
// Consistent with backend API standards for frontend plugin consumption
// ============================================================================

import express from 'express';
import { validateLokaliseToken, requireProjectId } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// GET /api/projects - LIST ALL ACCESSIBLE PROJECTS
// ============================================================================
// FRONTEND INTEGRATION: Powers the "Choose Project" dropdown in Builder.io plugin
// USER WORKFLOW: Plugin loads this data when user first opens translation settings
// RESPONSE: Array of projects with names, IDs, and metadata for selection UI
// AUTHENTICATION: Requires valid Lokalise API token via validateLokaliseToken middleware

router.get('/', validateLokaliseToken, async (req, res) => {
  try {
    // Call Lokalise API to fetch all projects accessible with provided token
    // Uses authenticated client created by validateLokaliseToken middleware
    const result = await req.lokaliseClient!.getAllProjects();
    
    // Return consistent API response format expected by frontend plugin
    res.json({
      success: true,           // Status flag for frontend error handling
      data: result,           // Project array: [{ project_id, name, description, ... }]
      timestamp: new Date().toISOString() // Request timestamp for debugging
    });
  } catch (error) {
    // Log detailed error for backend debugging
    console.error('💥 Error fetching projects:', error);
    
    // Return user-friendly error response to frontend plugin
    res.status(500).json({
      success: false,          // Consistent error response format
      error: {
        message: (error as any).message, // Lokalise API error details
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ============================================================================
// GET /api/projects/{projectId} - GET PROJECT DETAILS WITH LANGUAGES
// ============================================================================
// FRONTEND INTEGRATION: Loads selected project details for Builder.io plugin UI
// USER WORKFLOW: Called when user selects a project from dropdown - loads project info + languages
// CRITICAL FUNCTION: This endpoint MUST return project_id and name for frontend to work
// BUG FIX APPLIED: LokaliseClient.getProject() now correctly includes all project fields
//
// RESPONSE DATA STRUCTURE:
// {
//   success: true,
//   data: {
//     project: {
//       project_id: "123...",     // ✅ FIXED: Now included (was missing before bug fix)
//       name: "Project Name",     // ✅ FIXED: Now included (was missing before bug fix)  
//       languages: [...],         // Available project languages for selection
//       statistics: {...},        // Project progress and statistics
//       settings: {...}           // Project configuration
//     }
//   }
// }

router.get('/:projectId', validateLokaliseToken, requireProjectId, async (req, res) => {
  try {
    // Extract project ID from URL parameter (set by requireProjectId middleware)
    // Note: Uses German spelling "projektId" consistently throughout backend
    const projectId = req.projektId!;
    
    // CRITICAL CALL: This combines project details + languages in single response
    // Frontend plugin needs both project metadata AND available languages
    // Bug fix ensures project_id and name are correctly included in response
    const result = await req.lokaliseClient!.getProject(projectId);
    
    res.json({
      success: true,
      data: result,             // { project: { project_id, name, languages, ... } }
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching project:', error);
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
// GET /api/projects/{projectId}/contributors - GET PROJECT TEAM MEMBERS
// ============================================================================
// FRONTEND INTEGRATION: Optional endpoint for displaying project team information
// USER WORKFLOW: Plugin can show who has access to translate/review the project
// TEAM MANAGEMENT: Displays contributor permissions and language assignments
// USE CASE: Useful for project managers to understand team structure and access levels

router.get('/:projectId/contributors', validateLokaliseToken, requireProjectId, async (req, res) => {
  try {
    const projectId = req.projektId!;
    
    // Fetch project contributors with their roles and language permissions
    // Returns: { contributors: [{ user_id, email, fullname, is_admin, is_reviewer, languages: [...] }] }
    const result = await req.lokaliseClient!.getProjectContributors(projectId);
    
    res.json({
      success: true,
      data: result,             // Contributor array with permissions and language access
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching project contributors:', error);
    res.status(500).json({
      success: false,          // Consistent error response format
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;