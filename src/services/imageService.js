const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
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
                ext: path.extname(file)
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

        // failOnError: false handles slightly malformed JPEGs
        // rotate() automatically rotates images based on EXIF
        // limitInputPixels: false removes the pixel limit for very large images
        return await sharp(imagePath, { failOnError: false, limitInputPixels: false })
            .rotate()
            .resize(config.thumbnailSize)
            .jpeg({ quality: config.thumbnailQuality })
            .toBuffer();
    } catch (err) {
        console.error(`Error generating thumbnail for ${imagePath}:`, err.message);
        throw err;
    }
};

exports.updateImageOrder = async (images) => {
    try {
        console.log(`Updating timestamps for ${images.length} images...`);
        // Set start time in the past
        const startTime = Date.now() - (images.length * 1000);

        for (let i = 0; i < images.length; i++) {
            const imagePath = images[i].path;

            if (fs.existsSync(imagePath)) {
                const timestamp = new Date(startTime + (i * 1000));
                // fs-extra utimes works fine for setting mtime and atime
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
