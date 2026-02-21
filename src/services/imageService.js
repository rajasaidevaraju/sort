const fs = require('fs-extra');
const path = require('path');
const { Jimp } = require('jimp'); // Pure JS - works in Termux
const config = require('../config/config');
const fileUtils = require('../utils/fileUtils');

exports.listImages = async (folderPath) => {
    try {
        const files = await fs.readdir(folderPath);
        const images = files
            .filter(file => fileUtils.isImage(file))
            .map(file => ({
                name: file,
                path: path.join(folderPath, file),
                ext: path.extname(file).toLowerCase()
            }));
        return images;
    } catch (err) {
        console.error('Error in listImages service:', err);
        throw err;
    }
};

exports.generateThumbnail = async (imagePath) => {
    try {
        if (!fs.existsSync(imagePath)) {
            throw new Error(`File does not exist: ${imagePath}`);
        }

        const ext = path.extname(imagePath).toLowerCase();

        // Jimp (Pure JS) limitation: WebP is not supported natively.
        // We catch this early to avoid decoding errors.
        if (ext === '.webp') {
            console.warn(`WebP detected: Jimp cannot decode WebP on Termux/Windows. Skipping: ${imagePath}`);
            // You could return a placeholder buffer here if you have a "default.png"
            throw new Error('WebP decoding not supported by Jimp');
        }

        const image = await Jimp.read(imagePath);

        // In Jimp v1, resize uses an options object
        image.resize({ w: config.thumbnailSize || 300 });

        return await image.getBuffer('image/jpeg');
    } catch (err) {
        // Log detailed error but throw it so the controller can handle it
        console.error(`Jimp error for ${path.basename(imagePath)}:`, err.message);
        throw err;
    }
};

exports.updateImageOrder = async (images) => {
    try {
        const startTime = Date.now() - (images.length * 1000);
        for (let i = 0; i < images.length; i++) {
            const imagePath = images[i].path;
            if (fs.existsSync(imagePath)) {
                const timestamp = new Date(startTime + (i * 1000));
                await fs.utimes(imagePath, timestamp, timestamp);
            }
        }
    } catch (err) {
        console.error('Error in updateImageOrder service:', err);
        throw err;
    }
};

exports.browseDirectories = async (currentPath) => {
    const targetPath = currentPath || process.cwd();
    const items = await fs.readdir(targetPath, { withFileTypes: true });

    const dirs = items
        .filter(item => item.isDirectory() && !item.name.startsWith('.'))
        .map(item => ({
            name: item.name,
            path: path.join(targetPath, item.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return {
        currentPath: path.resolve(targetPath),
        parentPath: path.resolve(targetPath, '..'),
        directories: dirs
    };
};
