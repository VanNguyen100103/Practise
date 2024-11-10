const router = require('express').Router();
const ctrls = require('../controllers/product');
const { verifyToken, isAdmin } = require('../middlewares/verifyToken');
const {productUploader} = require('../configs/cloudinary');


router.post("/create", [verifyToken, isAdmin], productUploader.array("images",10) ,ctrls.createProduct)
router.get("/any", ctrls.getProducts)

module.exports = router;