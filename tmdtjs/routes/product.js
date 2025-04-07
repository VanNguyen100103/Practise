const router = require('express').Router();
const ctrls = require('../controllers/product');
const { verifyToken, isAdmin } = require('../middlewares/verifyToken');
const {productUploader} = require('../configs/cloudinary');


router.post("/create", [verifyToken, isAdmin], productUploader.array("images",10), ctrls.createProduct)
router.get("/any", ctrls.getProducts)
router.get("/one/:pid", ctrls.getOne)
router.put("/one/:pid", [verifyToken, isAdmin], productUploader.array("images",10), ctrls.updateProduct)
router.delete("/one/:pid", [verifyToken, isAdmin], ctrls.deleteProduct)
router.put("/one/images/:pid", [verifyToken, isAdmin], productUploader.array("images",10), ctrls.updateImages)
router.delete("/one/images/:pid", [verifyToken, isAdmin], ctrls.deleteImages)
router.put("/one/variants/:pid", [verifyToken, isAdmin], productUploader.array("images",10), ctrls.updateVariants)
router.delete("/one/variants/:pid", [verifyToken, isAdmin], ctrls.deleteVariant)
router.post("/ratings", verifyToken, ctrls.ratings)
router.get("/interact/:pid/:action", verifyToken, ctrls.interact)


module.exports = router;