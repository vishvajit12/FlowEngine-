const express = require('express');
const { getSummary, listExecutions } = require('../controllers/analyticsController');
const protect = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/summary', getSummary);
router.get('/executions', listExecutions);

module.exports = router;
