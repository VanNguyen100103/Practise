const asyncHandler = require("express-async-handler");
const Product = require('../models/product');

const createProduct = asyncHandler(async (req, res) => {
    const { title, slug, category, brand, price, sold, quantity, color, size, rentalStartDate, rentalEndDate, description } = req.body;
    const images = req.files ? req.files.map(file => file.path) : []; 
    const formatedDes = description.split(",")
    const formatedStartDate = new Date(rentalStartDate);
    const formatedEndDate = new Date(rentalEndDate);
    const product = await Product.create({
      title,
      slug,
      category,
      brand,
      price,
      sold,
      quantity,
      color,
      size,
      description: formatedDes,
      images,
      rentalStartDate: formatedStartDate,
      rentalEndDate: formatedEndDate,
    });
  
    return res.status(200).json({
      success: product ? true : false,
      newProduct: product ? product : false,
    });
});

const getProducts = asyncHandler(async (req, res)=>{
    const queries = {...req.query}
    const excludeFields = ["sort", "fields", "page", "limit"]
    excludeFields.forEach(field => delete queries[field])
    let queryString = JSON.stringify(queries)
    queryString = queryString.replace(/\b(gte|gt|lt|lte)\b/g, (matchEl)=> `$${matchEl}`)
    const formatedQueries = JSON.parse(queryString)
    if (queries.title) {
      formatedQueries.title = { $regex: req.query.title, $options: "i" };
    }else{
      delete formatedQueries.title
    }
    if (queries.color) {
      const colorsArray = queries.color.split(",");
      formatedQueries.color = { $in: colorsArray.map((color) => new RegExp(`^${color}$`, "i")) };
    }else{
      delete formatedQueries.color
    }
    let queryCommand = Product.find(formatedQueries)
    if(req.query.sort){
      const sortBy = req.query.sort.split(",").join(" ")
      queryCommand = queryCommand.sort(sortBy)
    }
    if(req.query.fields){
      const fields = req.query.fields.split(",").join(" ")
      queryCommand = queryCommand.select(fields)
    }
 
    const limit = +req.query.limit || process.env.LIMIT_PER_PAGE
    const page = +req.query.page || 1
    const skip = (page - 1) * limit
    queryCommand = queryCommand.skip(skip).limit(limit)
    const response = await queryCommand.exec()
    const counts = await Product.countDocuments(formatedQueries)
    return res.status(200).json({
      counts,
      products: response ? response : false
    })
})


module.exports = { createProduct, getProducts};