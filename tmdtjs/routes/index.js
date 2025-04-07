const { notFound, errHandler } = require("../middlewares/errHandler")
const userRouter = require("./user")
const productRouter = require("./product")
const paymentRouter = require("./payment")
const orderRouter = require("./order")
const initRoutes = (app) => {
  app.use("/api/user", userRouter)
  app.use("/api/product", productRouter)
  app.use("/api/order", orderRouter)
  app.use("/api/payment", paymentRouter)
  app.use(notFound)
  app.use(errHandler)
}

module.exports = initRoutes