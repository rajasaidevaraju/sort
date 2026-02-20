const imageService = require('../services/imageService');

exports.listImages = async (req, res) => {
    try {
        const { folderPath } = req.query;
        if (!folderPath) {
            return res.status(400).json({ error: 'folderPath is required' });
        }
        const images = await imageService.listImages(folderPath);
        res.json(images);
    } catch (error) {
        console.error('Controller error in listImages:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getThumbnail = async (req, res) => {
    try {
        const { imagePath } = req.query;
        if (!imagePath) {
            return res.status(400).json({ error: 'imagePath is required' });
        }
        const thumbnail = await imageService.generateThumbnail(imagePath);
        res.set('Content-Type', 'image/jpeg');
        res.send(thumbnail);
    } catch (error) {
        console.error('Controller error in getThumbnail:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const { images } = req.body;
        if (!images || !Array.isArray(images)) {
            return res.status(400).json({ error: 'images array is required' });
        }
        await imageService.updateImageOrder(images);
        res.json({ success: true, message: 'File timestamps updated to reflect new order' });
    } catch (error) {
        console.error('Controller error in updateOrder:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.browseDirectories = async (req, res) => {
    try {
        const { path: directoryPath } = req.query;
        const result = await imageService.browseDirectories(directoryPath);
        res.json(result);
    } catch (error) {
        console.error('Controller error in browseDirectories:', error);
        res.status(500).json({ error: error.message });
    }
};
