const crypto = require("crypto");
const fetch = require("node-fetch");
const Order = require("../models/order");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");


const momoConfig = {
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  partnerCode: "MOMO",
  orderInfo: "pay with MoMo",
  redirectUrl: "http://localhost:8000/api/payment/callback",
  ipnUrl: "https://2b24-14-169-31-246.ngrok-free.app/api/v1/callback",
  requestType: "payWithMethod",
  autoCapture: true,
  lang: "vi",
};

function createMomoSignature(rawSignature) {
  return crypto
    .createHmac("sha256", momoConfig.secretKey)
    .update(rawSignature)
    .digest("hex");
}

async function createMomoPayment(totalPrice, orderId, userId) {
  const extraData = JSON.stringify({ orderId, user: userId });
  const requestId = momoConfig.partnerCode + new Date().getTime();

  const rawSignature =
    "accessKey=" +
    momoConfig.accessKey +
    "&amount=" +
    totalPrice +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    momoConfig.ipnUrl +
    "&orderId=" +
    requestId +
    "&orderInfo=" +
    momoConfig.orderInfo +
    "&partnerCode=" +
    momoConfig.partnerCode +
    "&redirectUrl=" +
    momoConfig.redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    momoConfig.requestType;

  const signature = createMomoSignature(rawSignature);

  const requestBody = JSON.stringify({
    partnerCode: momoConfig.partnerCode,
    partnerName: "Test",
    storeId: "MomoTestStore",
    requestId,
    amount: totalPrice,
    orderId: requestId,
    orderInfo: momoConfig.orderInfo,
    redirectUrl: momoConfig.redirectUrl,
    ipnUrl: momoConfig.ipnUrl,
    lang: momoConfig.lang,
    requestType: momoConfig.requestType,
    autoCapture: momoConfig.autoCapture,
    extraData,
    signature,
  });

  const response = await fetch(
    "https://test-payment.momo.vn/v2/gateway/api/create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
      body: requestBody,
    }
  );

  const data = await response.json();
  return { success: true, data };
}

async function handleMomoCallback(query) {
  const paymentId = query.orderId;
  const status = "Shipping";
  const rawData = query.extraData;
  const parseData = JSON.parse(rawData);
  const orderId = parseData.orderId;

  const order = await Order.findByIdAndUpdate(orderId, {
    orderStatus: status,
    paidAt: new Date(),
    paymentStatus: query.message,
    deliveryDate: new Date( Date.now() + 48  * 60 * 60 *  1000),
    deliveryExpectDate: new Date( Date.now() + 7 *  24  * 60 * 60 *  1000),
  }, {new: true});
  await User.findByIdAndUpdate(order.orderBy, { cart: [] }, {new: true});
  const html = `Đơn hàng ${orderId} với trạng thái ${status} thanh toán với mã giao dịch ${order.transactionId} với tổng giá là: ${order.total}`
  const subject = "Momo-Thanh toán"
  const user = await User.findById(order.orderBy)
  await sendEmail({emal: user.email, html, subject})
  return { orderId };
}

async function checkMomoTransaction(orderId) {
  const rawSignature = `accessKey=${momoConfig.accessKey}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;
  const signature = createMomoSignature(rawSignature);

  const requestBody = JSON.stringify({
    partnerCode: "MOMO",
    requestId: orderId,
    orderId: orderId,
    signature: signature,
    lang: "vi",
  });

  const response = await fetch(
    "https://test-payment.momo.vn/v2/gateway/api/query",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    }
  );

  return await response.json();
}

module.exports = {
  momoConfig,
  createMomoSignature,
  createMomoPayment,
  handleMomoCallback,
  checkMomoTransaction,
};