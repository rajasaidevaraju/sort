const fs = require('fs-extra');
const path = require('path');
const { Jimp } = require('jimp');
const piexif = require('piexifjs');
const { execSync } = require('child_process');
const config = require('../config/config');
const fileUtils = require('../utils/fileUtils');

exports.listImages = async (folderPath) => {
    try {
        const files = await fs.readdir(folderPath);
        return files
            .filter(file => fileUtils.isImage(file))
            .map(file => ({
                name: file,
                path: path.join(folderPath, file),
                ext: path.extname(file).toLowerCase()
            }));
    } catch (err) {
        throw err;
    }
};

exports.generateThumbnail = async (imagePath) => {
    try {
        if (!fs.existsSync(imagePath)) throw new Error('File not found');
        const ext = path.extname(imagePath).toLowerCase();
        if (ext === '.webp') throw new Error('WebP not supported by Jimp');
        const image = await Jimp.read(imagePath);
        image.resize({ w: config.thumbnailSize || 300 });
        return await image.getBuffer('image/jpeg');
    } catch (err) {
        throw err;
    }
};

exports.updateImageOrder = async (images) => {
    try {
        console.log(`Finalizing order for ${images.length} images...`);
        const startTime = Date.now() - (images.length * 1000);

        for (let i = 0; i < images.length; i++) {
            const imagePath = images[i].path;
            const ext = images[i].ext || path.extname(imagePath).toLowerCase();

            if (fs.existsSync(imagePath)) {
                const targetDate = new Date(startTime + (i * 1000));

                if (ext === '.jpg' || ext === '.jpeg') {
                    try {
                        const jpegBuffer = fs.readFileSync(imagePath);
                        const jpegData = jpegBuffer.toString('binary');

                        let exifObj = { "0th": {}, "Exif": {}, "GPS": {} };
                        try {
                            exifObj = piexif.load(jpegData);
                        } catch (e) {
                            console.log("Creating new EXIF header (none found)");
                        }

                        const exifDate = targetDate.getFullYear() + ":" +
                            String(targetDate.getMonth() + 1).padStart(2, '0') + ":" +
                            String(targetDate.getDate()).padStart(2, '0') + " " +
                            String(targetDate.getHours()).padStart(2, '0') + ":" +
                            String(targetDate.getMinutes()).padStart(2, '0') + ":" +
                            String(targetDate.getSeconds()).padStart(2, '0');

                        // Update all standard date tags
                        exifObj["0th"][piexif.ImageIFD.DateTime] = exifDate;
                        exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = exifDate;
                        exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized] = exifDate;

                        const exifBytes = piexif.dump(exifObj);
                        const newJpegData = piexif.insert(exifBytes, jpegData);
                        fs.writeFileSync(imagePath, Buffer.from(newJpegData, 'binary'));
                    } catch (exifErr) {
                        console.warn(`EXIF Update failed for ${path.basename(imagePath)}:`, exifErr.message);
                    }
                }

                await fs.utimes(imagePath, targetDate, targetDate);
                const isTermux = process.env.PREFIX?.includes('com.termux');
                if (isTermux) {
                    try {
                        execSync(`termux-media-scan "${imagePath}"`, { stdio: 'ignore' });
                    } catch (e) {
                        console.warn(`Media Scan failed for ${path.basename(imagePath)}:`, e.message);
                    }
                } else {
                    console.warn("executing in non termux environment")
                }
            }
        }
    } catch (err) {
        console.error('Update Error:', err);
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
                if (stats.isDirectory()) dirs.push({ name: item.name, path: fullPath });
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
