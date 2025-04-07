const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mongoose = require('mongoose');


// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    unique: true,
    required: true
  },
  address: {
    type: Array,
    default: [],
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "user",
  },
  avatar: {
    public_id:{
      type: String,
      required: false
    },
    url:{
      type: String,
      required: false
    }
  }
  ,
  refreshToken: String,
  lastLoginAt: Date,
  isBlocked: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,  
  passwordResetExpires: Date,
  wishlist: [{product: {type: mongoose.Types.ObjectId, ref: "Product"}}],
  cart: [
    {
      product:{type: mongoose.Schema.Types.ObjectId, ref: "Product"},
      quantity: Number,
      color: String,
      size: String,
      rentalStartDate: Date,
      rentalEndDate: Date,
      price: Number,
      title: String,
      images: [String],
    }
  ]
},{timestamps: true});

userSchema.pre("save", async function(next){
  if(!this.isModified("password")){
    return next()
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
})

userSchema.methods = {
  comparePassword: async function(enteredPass){
    return await bcrypt.compare(enteredPass, this.password)
  },
  createPasswordChangedToken: function(){
    const resetToken = crypto.randomBytes(32).toString("hex")
    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    this.passwordResetExpires = Date.now() + 24*60*60*1000
    return resetToken
  }
}

//Export the model
module.exports = mongoose.model('User', userSchema);
