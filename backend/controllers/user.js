const asyncHandler = require("express-async-handler");
const User = require("../models/user");
const crypto = require("crypto");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/generateToken");
const sendEmail = require("../utils/sendEmail");
const makeToken = require("uniquid");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const register = asyncHandler(async (req, res) => {
  const { firstname, lastname, mobile, address, email, password } = req.body;
  if (!firstname || !lastname || !mobile || !address || !email || !password)
    throw new Error("Missing inputs!");
  const user = await User.findOne({ email });
  if (user) throw new Error("User existed!");
  let avatar;
  if (req.file) {
    avatar = {
      public_id: req.file.filename,
      url: req.file.path,
    };
  }
  const token = makeToken();
  res.cookie(
    "dataRegister",
    { ...req.body, avatar, token },
    {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    }
  );
  const html = `Xác nhận quá trình đăng ký trong vòng 24 giờ kể từ lúc nhận được mail.<br/>Xin quý khách click link phía dưới để đăng ký tài khoản.<br/><a href="${process.env.CLIENT_URL}/final-register/${token}">Xác nhận</a>`;
  await sendEmail({ email, html, subject: "Confirm Registration" });
  return res.status(200).json({
    success: true,
    mes: "Please check your email to confirm registration!",
  });
});

const finalRegister = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const cookie = req.cookies;
  if (!cookie || !cookie.dataRegister || cookie.dataRegister.token !== token) {
    return res.status(400).json({
      success: false,
      mes: "Registration failed due to invalid or missing token.",
    });
  }
  const { firstname, lastname, mobile, address, email, password, avatar } =
    cookie.dataRegister;
  res.clearCookie("dataRegister");
  const user = await User.create({
    firstname,
    lastname,
    mobile,
    address,
    email,
    password,
    avatar,
  });
  return res.status(200).json({
    success: user ? true : false,
    mes: user,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new Error("Missing inputs.");
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(400).json({ success: false, mes: "User chưa đăng ký." });
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(400).json({ success: false, mes: "Wrong password." });
  }
  const lastLoginAt = new Date(user.lastLoginAt);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (lastLoginAt < oneYearAgo) {
    user.isBlocked = true;
    await user.save();
    return res.status(403).json({ success: false, mes: "Account is blocked." });
  }
  const accesssToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id);
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    maxAge: 365 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        lastLoginAt: new Date(),
        isBlocked: false,
        refreshToken: newRefreshToken,
      },
    },
    { new: true }
  );
  return res.status(200).json({
    success: true,
    accesssToken,
    user: {
      firstname: user.firstname,
      lastname: user.lastname,
      mobile: user.mobile,
      address: user.address,
      avatar: user.avatar,
      email: user.email,
      isBlocked: user.isBlocked,
      lastLoginAt: user.lastLoginAt,
    },

  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new Error("Missing inputs!");
  const { _id } = req.user;
  const user = await User.findById(_id);
  if (!user) {
    return res.status(400).json({
      success: false,
      mes: "User haven't registered",
    });
  }
  const resetToken = await user.createPasswordChangedToken();
  const html = `Xác nhận quá trình đổi mật khẩu trong vòng 24 giờ kể từ lúc nhận được mail.<br/>Xin quý khách click link phía dưới để đổi mật khẩu.<br/><a href="${process.env.CLIENT_URL}/reset-password">Xác nhận</a>.<br/>Mã để đổi mk:${resetToken}`;
  await sendEmail({ email, html, subject: "Confirm Change Password" });
  await user.save();
  return res.status(200).json({
    success: true,
    mes: "Please check your email to confirm change password.",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password, token } = req.body;
  if (!token || !password) throw new Error("Missing inputs!");
  const passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const { _id } = req.user;
  const user = await User.findOne({
    _id: _id,
    passwordResetToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ success: false, mes: "User chưa đăng ký." });
  }
  user.password = password;
  user.passwordChangedAt = Date.now();
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save();
  return res.status(200).json({
    success: true,
    mes: "Change password successfully",
  });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie || !cookie.refreshToken)
    throw new Error("No refresh token in cookies.");
  jwt.verify(
    cookie.refreshToken,
    process.env.JWT_SECRETKEY,
    async (err, decode) => {
      if (err) throw new Error("Refreshtoken invalid!");
      req.user = decode;
      const response = await User.findOne({
        _id: decode._id,
        refreshToken: cookie.refreshToken,
      });
      return res.status(200).json({
        success: response ? true : false,
        accessToken: response
          ? generateAccessToken(response._id, response.role)
          : "Invalid refreshToken.",
      });
    }
  );
});

const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie || !cookie.refreshToken)
    throw new Error("No refresh token in cookies.");
  const user = await User.findOneAndUpdate(
    { refreshToken: cookie.refreshToken },
    { $set: { refreshToken: "" } },
    { new: true }
  );
  res.clearCookie("refreshToken");
  return res.status(200).json({
    success: user ? true : false,
    mes: user ? "Logout successfully!" : "Logout failed!",
  });
});

const getCurrent = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const user = await User.findById(_id).select(
    "-lastLoginAt -role -createAt -updatedAt"
  );
  return res.status(200).json({
    success: user ? true : false,
    user,
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const queries = { ...req.query };
  const excludeFields = ["sort", "fields", "page", "limit"];
  excludeFields.forEach((field) => delete queries[field]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lt|lte)\b/,
    (matchEl) => `$${matchEl}`
  );
  const formatedQueries = JSON.parse(queryString);
  if (queries.firstname || queries.lastname) {
    formatedQueries.$or = [
      queries.firstname && {
        firstname: { $regex: queries.firstname, $options: "i" },
      },
      queries.lastname && {
        lastname: { $regex: queries.lastname, $options: "i" },
      },
    ].filter(Boolean);
    delete formatedQueries.firstname;
    delete formatedQueries.lastname;
  } else {
    
    delete formatedQueries.firstname;
    delete formatedQueries.lastname;
  }

  let queryCommand =  User.find(formatedQueries)
  const page = +req.query.page || 1;
  const limit = +req.query.limit || process.env.LIMIT_PER_PAGE;
  const skip = (page - 1) * limit;
  queryCommand =  queryCommand.skip(skip).limit(limit);
  const response = await queryCommand.exec()
  const counts = await User.countDocuments(formatedQueries);

  return res.status(200).json({
    counts,
    users: response,
    mes: response ? "Successfully" : "False",
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { _id } = req.user
  if(!_id || Object.keys(req.body).length === 0) throw new Error("Missing input");
  const user = await User.findByIdAndUpdate(_id, req.body, {new: true})
  return res.status(200).json({
    success: user ? true : false,
    updateUser: user ? user : "Failed update"
  })
}
)

const updateUserAdmin = asyncHandler(async (req, res)=>{
    const { uid } = req.params
    if(!uid || Object.keys(req.body).length === 0) throw new Error("Missing inputs.")
    const user = await User.findByIdAndUpdate(uid, req.body, {new: true})
    return res.status(200).json({
        success: user ? true : false,
        updateUser: user ? user : "Failed update"
    })
})

const getAddress = asyncHandler(async (req, res) => {
    const { _id } = req.user
    if(!_id) throw new Error("Require login.")
    const user = await User.findById(_id)
    if(!user){
      return res.status(400).json({
        success: false,
        mes: "User not register"
      })
    }
    return res.status(200).json({
      success: user ? true : false,
      addresses: user ? user.address : "Cann't get address"
  })
})

const updateAddress = asyncHandler(async (req, res)=>{
    const { _id } = req.user
    if(!_id || Object.keys(req.body).length === 0){
        return res.status(400).json({
            success : false,
            mes: "Invalid user ID"
        })
    }
    if(!req.body?.address || typeof req.body.address !== "string"){
        return res.status(400).json({
            success : false,
            mes: "Address not string"
        })
    }
    const user = await User.findByIdAndUpdate(_id, {$push: {address: req.body.address}}, {new: true})
    return res.status(200).json({
        success: user ? true : false,
        address: user.address
    })
})
  
const updateCart = asyncHandler(async (req, res) => {
  const  _id  = req.user._id;
  const { pid, price, quantity, color, size, rentalStartDate, rentalEndDate, images, title } = req.body;

  // Kiểm tra các input cần thiết
  if (!pid || !quantity || !color || !size || !rentalStartDate || !rentalEndDate || !price  || !title) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết." });
  }

  const user = await User.findById(_id).select("cart");
  const existingProductIndex = user?.cart?.findIndex(
    el =>
      el.product.toString() === pid &&
      el.color === color &&
      el.size === size
  );

  if (existingProductIndex >= 0) {
    // Nếu sản phẩm đã tồn tại, chỉ tăng số lượng
    user.cart[existingProductIndex].quantity += quantity;

    await user.save();
    return res.status(200).json({
      success: true,
      updateUser: user,
    });
  } else {
    // Nếu sản phẩm chưa có trong giỏ, thêm mới
    user.cart.push({
      product: pid,
      quantity,
      color,
      size,
      rentalStartDate,
      rentalEndDate,
      price,
      images,
      title,
    });

    await user.save();
    return res.status(200).json({
      success: true,
      updateUser: user,
    });
  }
});

const deleteCart = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { pid } = req.params
    if(!pid ) throw new Error("Thiếu thông tin cần thiết")
    const user = await User.findById(_id).select("cart")
    if(user.cart.length > 0){
      user.cart = user.cart.filter(c => c.product.toString() !== pid)
      await user.save();
    }
    return res.status(200).json({
      success: true,
      mes: user ? `Product with ID ${pid} delete from cart user` : false
    })
}
)

module.exports = {
  register,
  finalRegister,
  login,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
  getCurrent,
  getUsers,
  updateUser,
  updateUserAdmin,
  getAddress,
  updateAddress,
  updateCart,
  deleteCart
};
