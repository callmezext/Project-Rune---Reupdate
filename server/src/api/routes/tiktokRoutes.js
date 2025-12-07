const express = require('express');
const router = express.Router();
const tiktokController = require('../controllers/tiktokController');
router.get('/check', tiktokController.checkProfile);

module.exports = router;