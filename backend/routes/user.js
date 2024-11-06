const { avatarUploader } = require("../configs/cloudinary")
const ctrls = require("../controllers/user")
const { verityToken, isAdmin } = require("../middlewares/verifyToken")
const router = require("express").Router()


router.post("/register", avatarUploader.single('avatar'), ctrls.register)
router.get("/final-register/:token", ctrls.finalRegister)
router.post("/login", ctrls.login)
router.post("/forgot-password", verityToken, ctrls.forgotPassword)
router.post("/reset-password", verityToken,ctrls.resetPassword)
router.get("/refresh-token",ctrls.refreshAccessToken)
router.get("/logout", ctrls.logout)
router.get("/", [verityToken, isAdmin], ctrls.getUsers)

module.exports = router