const express = require('express');
const { listCredentials, createCredential, updateCredential, deleteCredential } = require('../controllers/credentialController');
const protect = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

router.route('/').get(listCredentials).post(createCredential);
router.route('/:id').put(updateCredential).delete(deleteCredential);

module.exports = router;
