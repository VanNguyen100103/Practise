const User = require("../models/user");
const asyncHandler = require("express-async-handler");
const sendEmail = require("../utils/sendEmail");
const crypto = require('crypto');
const makeToken = require('uniquid');
const { generateAccessToken, generateRefreshToken } = require("../middlewares/generateToken");


const register = asyncHandler(async (req, res) => {
    const { firstname, lastname, mobile, address, email, password } = req.body;
    if(!firstname || !lastname || !mobile || !address || !email || !password)  throw new Error("Missing inputs.");
    const user = await User.findOne({ email });
    if(user) throw new Error("User existed!");
    let avatar;
    if(req.file){
        avatar = {
            public_id: req.file.filename,
            url: req.file.path
        }
    }
    const token = makeToken()
    res.cookie("dataRegister",{
        ...req.body, 
        avatar,
        token
    },{
        maxAge: 24*60*60*1000,
        httpOnly: true,
        sameSite: "lax"
    })
    const html = `Please confirm your registration by clicking the link below:<br/><a href="${process.env.CLIENT_URL}/final-register/${token}">Confirm Registration</a>`;
    await sendEmail({ email, html, subject: "Complete Your Registration" });
    return res.status(200).json({
        success: true,
        mes: "Please check your email to confirm registration."
    })
})

const finalRegister = asyncHandler(async (req, res)=>{
    const cookie = req.cookies
    const { token } = req.params
    if(!cookie || !cookie.dataRegister || cookie.dataRegister.token !== token){
        return res.status(400).json({
            success : false,
            mes: "Registration failed due to invalid or missing token",
        })
    }
    const {  firstname, lastname, mobile, address, email, password, avatar } = cookie.dataRegister;
    const user = await User.create({firstname, lastname, mobile, address, email, password, avatar })
    res.clearCookie("dataRegister")
    return res.status(200).json({
        success: user ? true : false,
        mes: user 
    })
})

const login = asyncHandler(async (req, res)=> {
    const { email, password } = req.body
    if(!email || !password) throw new Error("Missing inputs.")
    const user = await User.findOne({email}).select("-updatedAt -createdAt -isBlocked -lastLoginAt -__v -_id")
    if (!user) {
        return res.status(400).json({mes: "User didn't register!"})
    }
    if(!user.comparePassword(password)){
        return res.status(400).json({mes: "User entered wrong password!"})
    }
    
    if(user && user.comparePassword(password)){
        const accessToken = generateAccessToken(user._id, user.role)
        const newRefreshToken = generateRefreshToken(user._id)
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            maxAge: 12 * 30  * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        })
        await User.updateOne({lastLoginAt: Date.now()})
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1)
        if(oneYearAgo < user?.lastLoginAt?.getFullYear()){
            user.isBlocked = true
            await user.save()
        }
        return res.status(200).json({success: true, user, accessToken})
    }
    

})

module.exports = {register, finalRegister, login}
  