const { avatarUploader } = require("../configs/cloudinary")
const ctrls = require("../controllers/user")
const { verifyToken, isAdmin } = require("../middlewares/verifyToken")
const router = require("express").Router()


router.post("/register", avatarUploader.single('avatar'), ctrls.register)
router.get("/final-register/:token", ctrls.finalRegister)
router.post("/login", ctrls.login)
router.post("/forgot-password", verifyToken, ctrls.forgotPassword)
router.post("/reset-password", verifyToken,ctrls.resetPassword)
router.get("/refresh-token",ctrls.refreshAccessToken)
router.get("/logout", ctrls.logout)
router.get("/current", verifyToken, ctrls.getCurrent)
router.put("/cart", verifyToken, ctrls.updateCart)
router.delete("/cart/:pid", verifyToken, ctrls.deleteCart)
router.get("/address", verifyToken, ctrls.getAddress)
router.put("/address", verifyToken, ctrls.updateAddress)
router.get("/", [verifyToken, isAdmin], ctrls.getUsers)
router.put("/current", verifyToken, ctrls.updateUser)
router.put("/:uid", [verifyToken, isAdmin], ctrls.updateUserAdmin)

module.exports = router