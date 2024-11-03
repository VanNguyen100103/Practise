const mongoose = require("mongoose");

const connDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB);
    console.log("MongoDB connected successfully.");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connDb;
