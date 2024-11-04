const { avatarUploader } = require("../configs/cloudinary")
const ctrls = require("../controllers/user")
const { verityToken } = require("../middlewares/verifyToken")
const router = require("express").Router()


router.post("/register", avatarUploader.single('avatar'), ctrls.register)
router.get("/final-register/:token", ctrls.finalRegister)
router.post("/login", ctrls.login)
router.post("/forgot-password", verityToken, ctrls.forgotPassword)
router.post("/reset-password", verityToken,ctrls.resetPassword)

module.exports = router