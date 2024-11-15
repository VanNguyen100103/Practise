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
    queryString = queryString.replace(/\b(gte|gt|lt|lte)\b/g, (matchedEl)=>`$${matchedEl}`)
    const formatedQueries = JSON.parse(queryString)
    if(queries.title){
      formatedQueries.title = {$regex: queries.title, $options: "i"}
    }else{
      delete formatedQueries.title
    }
    if(queries.color){
      const colorsArray = queries.color.split(",")
      formatedQueries.color = {$in: colorsArray.map((c)=> new RegExp(c, "i"))}
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
      success: response ? true : false,
      counts,
      products: response ? response : false
    })
})

const getOne = asyncHandler(async (req, res) => {
    const { pid } = req.params
    const product = await Product.findById( pid )
    return res.status(200).json({
      success: product ? true : false,
      product: product ? product : false,
    })
}
)

const updateProduct = asyncHandler(async (req,res)  => {
    const { pid } = req.params
    if(!pid || Object.keys(req.body).length === 0) throw new Error("Missing input.")
    const product = Product.findByIdAndUpdate( pid , req.body, {new: true})
    return res.status(200).json({
      success: product ? true : false,
      updateProduct: product ? product : false
    })
})


const updateImages = asyncHandler(async (req,res)=> {
    const { pid } = req.params
    if(!pid || !req.files) throw new Error("Missing input.")
    const product = Product.findByIdAndUpdate( pid , {$push: {$each: req.files(file => file.path)}}, {new: true})
    return res.status(200).json({
      success: product ? true : false,
      updateProduct: product ? product : false
    })
})

const updateVariants = asyncHandler(async (req,res)=>{
    const { pid } = req.params
    if(!pid || !req.files || !title || !color || !size || !price) throw new Error("Missing input.")
    const product = await Product.findByIdAndUpdate( pid , {$push: {variants: {title, color, size, price, images: req.files.map(file => file.path)}}}, {new: true})
    return res.status(200).json({
      success: product ? true : false,
      product: product ? product : false
    })
})

const deleteVariant = asyncHandler(async (req,res)=>{
  const { pid } = req.params
  const {title, color, size} = req.body
  if(!pid || !title || !color || !size) throw new Error("Missing input.")
  const product = await Product.findById( pid )
  if(product.variants.length > 0)
    product.variants = product.variants.filter(variant => variant.title !== title && variant.color !== color && variant.size !== size )
    await product.save()
    return res.status(200).json({
      success: product ? true : false,
      product: product ? product : false
    })
  
 
})

module.exports = { createProduct, getProducts, getOne, updateProduct, updateImages, updateVariants, deleteVariant};