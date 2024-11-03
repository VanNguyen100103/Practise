const { avatarUploader } = require("../configs/cloudinary")
const ctrls = require("../controllers/user")
const router = require("express").Router()


router.post("/register", avatarUploader.single('avatar'), ctrls.register)
router.get("/final-register/:token", ctrls.finalRegister)
router.post("/login", ctrls.login)

module.exports = router