const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
var orderSchema = new mongoose.Schema({
    orderBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            price: {
                type: Number,
                required: true
            },
            color: {
                type: String
            },
            size: {
                type: String
            },
            rentalStartDate: Date,
            rentalEndDate: Date
        }
    ],
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
    },
    total: {
        type: Number,
        required: true
    },
    shippingAddress: {
        fullname: { type: String, required: true },
        mobile: { type: String, required: true },
        address: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true }
    },
    paidAt:{
        type: Date,
    },
    paymentMethod: {
        type: String,
        enum: ["COD", "Momo", "VNPay"],
        required: true
    },
    paymentStatus: {
        type: String,
        default: "Pending"
    },
    orderStatus: {
        type: String,
        enum: ["Pending", "Confirmed", "Shipping", "Delivered", "Cancelled"],
        default: "Pending"
    },
    orderDate: {
        type: Date,
        default: new Date(),
    },
    deliveryDate: {
        type: Date
    },
    deliveryExpectDate: {
        type: Date
    },
    transactionId: {
        type: String
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Order', orderSchema);
