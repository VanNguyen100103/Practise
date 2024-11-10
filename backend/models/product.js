const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var productSchema = new mongoose.Schema({
    title:{
        type:String,
        unique:true,
        trim:true,
    },
    slug:{
        type:String,
        unique:true,
        required:true,
        lowcase:true
    },
    category:{
        type:String,
        required:true,
    },
    brand:{
        type:String,
        required:true,
    },
    color:{
        type: String,
        enum: ["Black", "White", "Pink", "Red", "Blue"]
    },
    size:{
        type: String,
        enum: ["S", "M", "L"]
    },
    price: {
        type:Number,
        required: true,
    },
    sold: {
        type:Number,
        default: 0,
    },
    quantity: {
        type:Number,
        default: 0,
    },
    description: {
        type:Array,
        required:true,
    },
    images: {
        type:Array,
        required:true,
    },
    rentalStartDate: {
        type:Date,
        required: false
    },
    rentalEndDate: {
        type:Date,
        required: false
    },
    ratings: [
        {
            star:Number,
            postBy: {type: mongoose.Types.ObjectId, ref: "User"},
            comment:String
        }
    ],
    totalRatings: {
        type: Number,
        default: 0,
    },
    variants:[
        {
            title:String,
            color:String,
            size:String,
            price:Number,
            images: Array
        }
    ]
},{timestamps: true});

//Export the model
module.exports = mongoose.model('Product', productSchema);