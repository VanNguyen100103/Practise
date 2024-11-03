const jwt = require('jsonwebtoken');

const generateAccessToken = (uid, role) =>  jwt.sign({_id: uid, role: role}, process.env.JWT_SECRETKEY, {expiresIn: "1d"})
const generateRefreshToken = (uid) =>  jwt.sign({_id: uid}, process.env.JWT_SECRETKEY, {expiresIn: "365d"})

module.exports = {generateAccessToken, generateRefreshToken}