const jwt = require('jsonwebtoken');
const asyncHandler = require("express-async-handler");

const verityToken = asyncHandler((req, res, next) => {
    if(req?.headers?.authorization?.startsWith("Bearer")) {
        const token = req.headers.authorization.split(" ")[1]
        jwt.verify(token, process.env.JWT_SECRETKEY, (err, decode) => {
          if(err) return res.status(401).json({ success: false, mes: "Invalid accesstoken!"});
            req.user = decode
            next();
        })
    }else{
        return res.status(401).json({
            success: false,
            mes: "Unauthorized"
        })
    }
})

const isAdmin = asyncHandler((req, res, next) => {
    const {role} = req.user
    if(role !== "admin") {
        return res.status(401).json({success: false, mes: "REQUIRE ROLE IS ADMIN"}) 
    }
    next()
})



module.exports = {verityToken, isAdmin}