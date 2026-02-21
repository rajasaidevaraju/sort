const fs = require('fs-extra');
const path = require('path');
const { Jimp } = require('jimp');
const piexif = require('piexifjs'); // Pure JS EXIF library
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
        if (ext === '.webp') {
            throw new Error('WebP decoding not supported by Jimp');
        }
        const image = await Jimp.read(imagePath);
        image.resize({ w: config.thumbnailSize || 300 });
        return await image.getBuffer('image/jpeg');
    } catch (err) {
        console.error(`Jimp error for ${path.basename(imagePath)}:`, err.message);
        throw err;
    }
};

exports.updateImageOrder = async (images) => {
    try {
        console.log(`Deep-updating ${images.length} images (Filesystem + EXIF)...`);

        // Use a date in the past to build the sequence
        const startTime = Date.now() - (images.length * 1000);

        for (let i = 0; i < images.length; i++) {
            const imagePath = images[i].path;
            const ext = images[i].ext || path.extname(imagePath).toLowerCase();

            if (fs.existsSync(imagePath)) {
                const targetDate = new Date(startTime + (i * 1000));

                // 1. Update EXIF Metadata (For Gallery Apps)
                // Only works for JPEG/JPG
                if (ext === '.jpg' || ext === '.jpeg') {
                    try {
                        const jpegBuffer = fs.readFileSync(imagePath);
                        const jpegData = jpegBuffer.toString('binary');

                        // Format: "YYYY:MM:DD HH:MM:SS"
                        const exifDate = targetDate.getFullYear() + ":" +
                            String(targetDate.getMonth() + 1).padStart(2, '0') + ":" +
                            String(targetDate.getDate()).padStart(2, '0') + " " +
                            String(targetDate.getHours()).padStart(2, '0') + ":" +
                            String(targetDate.getMinutes()).padStart(2, '0') + ":" +
                            String(targetDate.getSeconds()).padStart(2, '0');

                        const exifObj = { "0th": {}, "Exif": {} };
                        exifObj["0th"][piexif.ImageIFD.DateTime] = exifDate;
                        exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = exifDate;
                        exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized] = exifDate;

                        const exifBytes = piexif.dump(exifObj);
                        const newJpegData = piexif.insert(exifBytes, jpegData);
                        const newBuffer = Buffer.from(newJpegData, 'binary');

                        fs.writeFileSync(imagePath, newBuffer);
                        console.log(`Updated EXIF for: ${path.basename(imagePath)}`);
                    } catch (exifErr) {
                        console.warn(`Could not update EXIF for ${imagePath}:`, exifErr.message);
                    }
                }

                // 2. Update Filesystem Timestamps (For File Managers)
                await fs.utimes(imagePath, targetDate, targetDate);
            }
        }
    } catch (err) {
        console.error('Error in updateImageOrder service:', err);
        throw err;
    }
};

exports.browseDirectories = async (currentPath) => {
    try {
        const targetPath = currentPath || process.cwd();
        const items = await fs.readdir(targetPath, { withFileTypes: true });
        const dirs = [];
        for (const item of items) {
            const fullPath = path.join(targetPath, item.name);
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    dirs.push({ name: item.name, path: fullPath });
                }
            } catch (e) { }
        }
        return {
            currentPath: path.resolve(targetPath),
            parentPath: path.resolve(targetPath, '..'),
            directories: dirs.sort((a, b) => a.name.localeCompare(b.name))
        };
    } catch (err) {
        throw err;
    }
};
