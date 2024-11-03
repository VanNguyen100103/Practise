const cloudinary = require("cloudinary").v2;
const multer = require('multer');
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});


const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'avatar',
        allowedFormats: ['jpg', 'png', 'webp'],
    },
    limits: {
        fileSize: 5 * 1024 * 1024 
    }
})

const avatarUploader = multer({storage: avatarStorage})

module.exports = {avatarUploader}