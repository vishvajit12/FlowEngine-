const express = require('express');
const { listWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow } = require('../controllers/workflowController');
const { runWorkflow } = require('../controllers/executionController');
const protect = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

router.route('/').get(listWorkflows).post(createWorkflow);
router.route('/:id').get(getWorkflow).put(updateWorkflow).delete(deleteWorkflow);
router.post('/:id/run', runWorkflow);

module.exports = router;
