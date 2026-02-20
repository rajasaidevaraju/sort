const path = require('path');
const config = require('../config/config');

exports.isImage = (fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    return config.imageExtensions.includes(ext);
};

exports.getNewSequenceName = (index, originalExt) => {
    return `${index + 1}${originalExt}`;
};
