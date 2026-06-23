import express from 'express';
import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  deleteAllRecords,
  getStats,
} from './admin_panel.controller.js';

const router = express.Router();

// Dashboard stats — must be before /:resource to avoid being shadowed
router.get('/stats', getStats);

// Composite-ID models (2-part key): must come before /:resource/:id
router.get('/:resource/:p1/:p2',    getRecord);
router.put('/:resource/:p1/:p2',    updateRecord);
router.delete('/:resource/:p1/:p2', deleteRecord);

// Simple-ID models
router.get('/:resource',        listRecords);
router.post('/:resource',       createRecord);
router.delete('/:resource',     deleteAllRecords);   // DELETE ALL rows
router.get('/:resource/:id',    getRecord);
router.put('/:resource/:id',    updateRecord);
router.delete('/:resource/:id', deleteRecord);

export default router;
