const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

router.get('/list', imageController.listImages);
router.get('/thumbnail', imageController.getThumbnail);
router.post('/update-order', imageController.updateOrder);
router.get('/browse', imageController.browseDirectories);

module.exports = router;
