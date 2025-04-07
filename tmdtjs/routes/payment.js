const express = require("express");
const crypto = require("crypto");
const User = require("../models/user");
const Order = require("../models/order");
const Coupon = require("../models/coupon");
const Product = require("../models/product");
const { verifyToken } = require("../middlewares/verifyToken");
const {
  createMomoPayment,
  handleMomoCallback,
  checkMomoTransaction,
} = require("../controllers/payment");

const moment = require("moment/moment");
const uuid = require("uuid");
const qs = require("qs");
const createHttpError = require("http-errors");
const user = require("../models/user");
const mongoose = require("mongoose");
const path = require("path");

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
    try{
        let {totalPrice, coupon: couponId, fullname, mobile, address, postalCode, country } = req.body
        const userId = req.user._id
        let discount = 0;
        if(couponId){
            const foundCoupon = await Coupon.findOne({_id: couponId, expiry: {$gt: new Date(), discount: {$gt: 0}}})
            if(foundCoupon){
                discount = foundCoupon.discount
                totalPrice = (1- discount/100) * totalPrice
            }
        }
        const user = await User.findById(userId)
        const shippingAddress = {
            fullname,
            mobile,
            address,
            postalCode,
            country
        }
        const orderData = await Order.create({
            orderBy: userId,
            products: user.cart,
            shippingAddress,
            paidAt: new Date(),
            paymentMethod: "Momo",
            total: totalPrice
    })
    if (couponId && discount > 0) {
        orderData.coupon = couponId;
    }
    const createdOrder = await Order.create(orderData);
    const paymentResult = await createMomoPayment(
        totalPrice,
        createdOrder._id,
        userId
    );
    
    return res.status(200).json(paymentResult);
    }catch(error){
        console.log("Payment: ", error);
        return res.status(500).json({
            success: false,
            mes: "Interval Server Error"
        });
    }
}
)

router.get("/callback", async (req, res) => {
    try {
      const result = await handleMomoCallback(req.query);
      res.redirect(
        `http://localhost:3000/api/order/me?orderId=${result.orderId}`
      );
    } catch (error) {
      console.error("Callback Error:", error);
      res.redirect("http://localhost:3000/api/order/me?orderId=null");
    }
});
  
router.post(
    "/check-status-transaction",
    verifyToken,
    async (req, res) => {
      try {
        const { orderId } = req.body;
        const result = await checkMomoTransaction(orderId);
        res.status(200).json(result);
      } catch (error) {
        console.error("Error:", error);
        res
          .status(500)
          .json({ error: "An error occurred while processing your request." });
      }
    }
  );

  function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
  }
  
  const getAmountUser = async (userId) => {
    const result = await user.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      {
        $unwind: "$cart",
      },
      {
        $project: {
          _id: "$cart._id",
          totalItemPrice: { $multiply: ["$cart.price", "$cart.quantity"] },
        },
      },
      {
        $group: {
          _id: null, 
          totalCartPrice: { $sum: "$totalItemPrice" }, 
        },
      },
      {
        $project: { _id: 0, total: "$totalCartPrice" },
      },
    ]);
  
    return result?.[0]?.total || 0;
  };
  
  router.post("/vnpay", verifyToken, async (req, res) => {
    try {
      process.env.TZ = "Asia/Ho_Chi_Minh";
  
      let date = new Date();
      let createDate = moment(date).format("YYYYMMDDHHmmss");
      let ipAddr =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
  
      let vnp_TmnCode = process.env.vnp_TmnCode;
      let vnp_HashSecret = process.env.vnp_HashSecret;
      let vnp_Url = process.env.vnp_Url;
      let vnp_ReturnUrl = process.env.vnp_ReturnUrl;
  
      let { locale, ...body } = req.body;
      const { _id: userId } = req.user;
  
      if (!locale) {
        locale = "vn";
      }
  
      const id = uuid.v4();
  
      let amount = await getAmountUser(userId);
  
      if (body.coupon) {
        const discount = (await coupon.findById(body.coupon))?.discount || 0;
        amount = amount - (amount * discount) / 100;
      }
  
      let currCode = "VND";
      let vnp_Params = {};
      vnp_Params["vnp_Version"] = "2.1.0";
      vnp_Params["vnp_Command"] = "pay";
      vnp_Params["vnp_TmnCode"] = vnp_TmnCode;
      vnp_Params["vnp_Locale"] = locale;
      vnp_Params["vnp_CurrCode"] = currCode;
      vnp_Params["vnp_TxnRef"] = id;
      vnp_Params["vnp_OrderInfo"] = JSON.stringify({
        userId,
        ...body?.userInfo,
        coupon: body.coupon || "",
      });
      vnp_Params["vnp_OrderType"] = "other";
      vnp_Params["vnp_Amount"] = amount > 0 ? amount * 100 : 0;
      vnp_Params["vnp_ReturnUrl"] = vnp_ReturnUrl;
      vnp_Params["vnp_IpAddr"] = ipAddr;
      vnp_Params["vnp_CreateDate"] = createDate;
  
      vnp_Params = sortObject(vnp_Params);
  
      let querystring = qs;
      let signData = querystring.stringify(vnp_Params, { encode: false });
      let crypto = require("crypto");
      let hmac = crypto.createHmac("sha512", vnp_HashSecret);
      let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
      vnp_Params["vnp_SecureHash"] = signed;
      vnp_Url += "?" + querystring.stringify(vnp_Params, { encode: false });
  
      return res.json(vnp_Url);
    } catch (error) {
      console.error("Payment Error:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  
  router.get("/vnpay_success", async (req, res) => {
    try {
      let vnp_Params = req.query;
  
      let secureHash = vnp_Params["vnp_SecureHash"];
  
      delete vnp_Params["vnp_SecureHash"];
      delete vnp_Params["vnp_SecureHashType"];
  
      vnp_Params = sortObject(vnp_Params);
      let secretKey = process.env.vnp_HashSecret;
  
      let querystring = require("qs");
      let signData = querystring.stringify(vnp_Params, { encode: false });
      let crypto = require("crypto");
      let hmac = crypto.createHmac("sha512", secretKey);
      let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
  
      if (secureHash !== signed) {
        throw createHttpError[400]("payment faild");
      }
  
      const json = vnp_Params["vnp_OrderInfo"];
  
      const decodedStr = decodeURIComponent(json);
      const obj = JSON.parse(decodedStr);
  
      console.log(obj);
  
      const userInfo = await user.findById(obj.userId, "cart");
  
      const products = userInfo
        ? userInfo.cart.map((cart) => ({
            product: cart.product,
            count: cart.quantity,
            color: cart.color,
          }))
        : [];
  
      const status = "Shipping";
      let total = await getAmountUser(obj.userId);
  
      if (obj?.coupon) {
        const discount = (await coupon.findById(obj.coupon))?.discount || 0;
        total = total - (total * discount) / 100;
        await coupon.findByIdAndDelete(obj.coupon);
      }
  
      const orderBy = obj.userId;
  
      await order.create({
        products,
        status,
        total,
        orderBy,
        name: obj?.name,
        address: obj?.address,
        phone: obj?.phone
      });
  
      userInfo.cart = [];
  
      await userInfo.save();
      const html = 'Đơn hàng của bạn đã thanh toán thành công.<br/>Mọi thông tin chi tiết ở bên dưới.'
      const subject = "VNPAY-Thanh toán"
      await sendMail({email: "nganhvan1609@gmail.com", html, subject})
  
      res.redirect("http://localhost:8000/api/payment/payment_success");
    } catch (error) {
      console.error("Payment Error:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  
  router.get("/payment_success", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "views", "payment-success.html"));
  });
  

module.exports = router


