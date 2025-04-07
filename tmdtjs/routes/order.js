const router = require('express').Router();
const {verifyToken} = require('../middlewares/verifyToken');
const ctrls = require('../controllers/order');

router.get("/me/:oid", verifyToken, ctrls.getOrderMe)

module.exports = router;