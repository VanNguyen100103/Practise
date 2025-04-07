const Order = require('../models/order');
const asyncHandler = require("express-async-handler");
const redis = require('../configs/redis');

const getOrderMe = asyncHandler(async (req, res) => {
  const oid = req.params.oid;
  const userId = req.user._id; 
  const cachedOrder = await redis.get(`order:${userId}:${oid}`);
  if (cachedOrder) {
    // Nếu đơn hàng có trong Redis, trả về từ Redis
    return res.status(200).json({
      success: true,
      order: JSON.parse(cachedOrder)
    });

 
  }else{
    const order = await Order.findById(oid);
       // Lưu vào Redis với thời gian hết hạn (ví dụ: 1 giờ)
    await redis.setex(`order:${userId}:${oid}`, 3600, JSON.stringify(order));
    return res.status(200).json({
      success: order ? true : false,
      order
    })
 
    
  }
 
}
)

module.exports = {getOrderMe}

