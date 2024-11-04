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

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new Error("Missing inputs.");

    const user = await User.findOne({ email }).select("+password"); // Lấy mật khẩu đã mã hóa để so sánh
    if (!user) {
        return res.status(400).json({ mes: "User didn't register!" });
    }

    // So sánh mật khẩu
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(400).json({ mes: "User entered wrong password!" });
    }

    // Đăng nhập thành công
    const accessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        maxAge: 12 * 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    });

    await User.updateOne({ _id: user._id }, { lastLoginAt: Date.now() }); // Cập nhật thời gian đăng nhập cuối

    return res.status(200).json({
        success: true,
        user: {
            firstname: user.firstname,
            lastname: user.lastname,
            mobile: user.mobile,
            address: user.address,
            email: user.email,
        },
        accessToken
    });
});


const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new Error("User didn't register");

    // Tạo token đặt lại mật khẩu
    const resetToken = user.createPasswordChangedToken();

    // Lưu thay đổi vào cơ sở dữ liệu
    await user.save(); 

    // Gửi email với link reset password
    const html = `Thời gian tồn tại của mã trong 24 giờ kể từ lúc nhận được.<br/>Xin quý khách click link bên dưới để đổi mật khẩu.<br/><a href="${process.env.CLIENT_URL}/forgot-password/${resetToken}">Confirm</a>`;
    await sendEmail({ email, html, subject: "Forgot Password" });

    return res.status(200).json({ success: true, mes: "Please check your email!" });
});


const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) throw new Error("Missing inputs.");

    // Mã hóa token nhận được từ yêu cầu để so sánh
    const passwordResetToken = crypto.createHash("sha256").update(token).digest("hex");

    // Tìm người dùng với token khớp và token chưa hết hạn
    const user = await User.findOne({
        passwordResetToken,
        passwordResetExpires: { $gt: Date.now() } // kiểm tra hạn của token
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            mes: "Invalid or expired token"
        });
    }

    // Đặt lại mật khẩu và xóa các thuộc tính liên quan đến token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();

    await user.save();

    return res.status(200).json({
        success: true,
        mes: "Password changed successfully!"
    });
});



module.exports = {register, finalRegister, login, forgotPassword, resetPassword}
  