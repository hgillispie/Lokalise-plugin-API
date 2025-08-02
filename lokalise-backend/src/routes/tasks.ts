// ============================================================================
// TASK ROUTES - TRANSLATION TASK MANAGEMENT AND WORKFLOW
// ============================================================================
// These endpoints manage translation tasks and contributor assignments in Lokalise.
// They support project management workflows for organizing translation work.
//
// FRONTEND INTEGRATION WORKFLOW:
// 1. Content extracted and keys created in Lokalise
// 2. Project manager creates tasks via POST /api/tasks/{projectId}
// 3. Tasks assigned to specific contributors with deadlines
// 4. Progress tracked via GET /api/tasks/{projectId} and GET /api/tasks/{projectId}/{taskId}
// 5. Contributors receive notifications and complete assigned translations
//
// TASK MANAGEMENT FEATURES:
// - Task creation with contributor assignments
// - Language-specific task assignments
// - Progress tracking and completion status
// - Due date management and notifications
// - Review workflow integration
//
// USE CASES:
// - Large translation projects requiring coordination
// - Quality assurance and review workflows
// - Deadline management for translation delivery
// - Contributor workload distribution
// ============================================================================

import express from 'express';
import { validateLokaliseToken, requireProjectId } from '../middleware/auth';
import { validateCreateTask } from '../middleware/validation';

const router = express.Router();

// ============================================================================
// GET /api/tasks/{projectId} - LIST PROJECT TRANSLATION TASKS
// ============================================================================
// FRONTEND INTEGRATION: Display project tasks for management and progress tracking
// USER WORKFLOW: Project managers view all tasks and their completion status
// RESPONSE: Array of tasks with progress, assignees, and due dates

router.get('/:projectId', validateLokaliseToken, requireProjectId, async (req, res) => {
  try {
    const projektId = req.projektId!;
    const result = await req.lokaliseClient!.getTasks(projektId);
    
    res.json({
      success: true,
      data: result,
      count: result.tasks?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching tasks:', error);
    res.status(500).json({
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get specific task
router.get('/:projectId/:taskId', validateLokaliseToken, requireProjectId, async (req, res) => {
  try {
    const projektId = req.projektId!;
    const taskId = parseInt(req.params.taskId, 10);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        error: {
          message: 'Task ID must be a valid number',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const result = await req.lokaliseClient!.getTask(taskId, projektId);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching task:', error);
    res.status(500).json({
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Create new task
router.post('/:projectId', validateLokaliseToken, requireProjectId, validateCreateTask, async (req, res) => {
  try {
    const projektId = req.projektId!;
    const taskData = req.body;
    
    console.log(`🎯 Creating translation task in project ${projektId}:`, {
      title: taskData.title,
      languages: taskData.languages?.map((l: any) => l.language_iso),
      keysCount: taskData.keys?.length || 0,
      task_type: taskData.task_type || 'translation'
    });
    
    const result = await req.lokaliseClient!.createTask(taskData, projektId);
    
    console.log(`✅ Created translation task:`, {
      task_id: result.task?.task_id,
      title: result.task?.title,
      status: result.task?.status
    });
    
    res.json({
      success: true,
      data: result,
      task_id: result.task?.task_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error creating task:', error);
    res.status(500).json({
      error: {
        message: (error as any).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;