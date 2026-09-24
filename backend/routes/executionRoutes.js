const express = require('express');
const { getExecution, downloadPdf, retryExecution, replayNode } = require('../controllers/executionController');
const protect = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/:id', getExecution);
router.get('/:id/pdf', downloadPdf);
router.post('/:id/retry', retryExecution);
router.post('/:id/replay', replayNode);

module.exports = router;
