const asyncHandler = require("express-async-handler");
const Product = require('../models/product');

const createProduct = asyncHandler(async (req, res) => {
  const { title, slug, brand, category, price, size, color, stock, description} = req.body
  const images = req.files ? req.files.map(file => file.path) : []
  if(!(title || slug || category || price || images || size || color || stock || description || brand)) {
    return res.status(400).json({
      success: false,
      mes: "Missing input."
    })
  }
  const existingProduct = await Product.findOne({title, slug, brand, category, price, size, color, stock, description})
  if(existingProduct) {
    return res.status(400).json({
      success: false,
      mes: "Product existed."
    })
  }
  let formatedDes
  if((description.startsWith("<div>") && description.endsWith("</div>")) || (description.startsWith("<p>") && description.endsWith("</p>"))){
    formatedDes = description.replace(" ","").replace("<div>","").replace("</div>","").replace("</p>","").replace("<p>","").split(",")
  }
  const product = await Product.create({title, slug, brand, category, price, size, color, stock, description: formatedDes, images})
  return res.status(200).json({
    success : product ? true : false,
    newProduct: product ? product : false
  })
})

const getOne = asyncHandler(async (req, res) => {
    const {pid} = req.params
    const product = await Product.findById(pid)
    return res.status(200).json({
      success: product ? true : false,
      product: product ? product : false
    })
}
)

const getProducts = asyncHandler(async (req, res) => {
    const queries = {...req.query}
    const excludeFields = ["sort", "fields", "limit", "page"]
    excludeFields.forEach(field => delete queries[field])
    let queryString = JSON.stringify(queries)
    queryString = queryString.replace(/\b(gte|gt|lt|lte)\b/, (matchedEl)=> `$${matchedEl}`)
    const formatedQueries = JSON.parse(queryString)
    if(queries.title || queries.brand){
      formatedQueries.$or = [
        queries.title && {title: {$regex: queries.title, $options: "i"}},
        queries.brand && {title: {$regex: queries.brand, $options: "i"}}
      ].filter(Boolean)
      delete formatedQueries.title
      delete formatedQueries.brand
    }else{
      delete formatedQueries.title
      delete formatedQueries.brand
    }
    if(queries.color){
      const colorsArray = queries.color.split(",")
      formatedQueries.color ={$in: colorsArray.map((c)=> new RegExp(c, "i"))}
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
    const page = +req.query.page || 1
    const limit = +req.query.limit || process.env.LIMIT_PER_PAGE
    const skip = (page - 1) * limit
    queryCommand = queryCommand.skip(skip).limit(limit)
    const response = await queryCommand.exec()
    const counts = await Product.countDocuments(formatedQueries)
    return res.status(200).json({
      counts,
      products: response ? response : false
    })
}
)

const updateProduct = asyncHandler(async (req, res) => {
    const {pid} = req.params
    if(!pid || Object.keys(req.body).length === 0){
      return res.status(400).json({
        success: false,
        mes: "Missing input."
      })
    }
    const response = await Product.findByIdAndUpdate(pid, req.body, {new: true})
    return res.status(200).json({
      success: response ? true : false,
      updateProduct: response ? response : false
    })
})

const deleteProduct = asyncHandler(async (req,res)=>{
  const {pid} = req.params
  if(!pid){
    return res.status(400).json({
      success: false,
      mes: "Missing input."
    })
  }
  const response = await Product.findByIdAndDelete(pid, req.body, {new: true})
  return res.status(200).json({
    success: response ? true : false,
    deleteProduct: response ? `Product with ${pid} deleted` : false
  })
})

const updateImages = asyncHandler(async (req,res)=>{
  const {pid} = req.params
  const product = await Product.findByIdAndUpdate(pid,{$push: {images: {$each: req.files.map(file => file.path)}}}, {new: true})
  return res.status(200).json({
    success: true,
    product: product ? product : false
  })
})

const deleteImages = asyncHandler(async (req,res)=>{
  const {pid} = req.params
  const url = req.body.url
  const product = await Product.findById(pid).select("images")
  if(product.images.length > 0){
    product.images = product.images.filter(file => file !== url)
    await product.save()
  }
  return res.status(200).json({
    success: true,
    deleteImages: `${url} delete from product images`
  })
})

const updateVariants = asyncHandler(async (req,res) => {
  const {pid} = req.params
  const {title, price, color, size } = req.body
  const images = req.files ? req.files.map(file => file.path) : []
  if(!(title || price || color || size || images)){
    return res.status(400).json({
      success: false,
      mes: "Missing inputs."
    })
  }
  const product = await Product.findByIdAndUpdate(pid, {$push: {variants: {title, price, color, size, images}}}, {new: true})
  return res.status(200).json({
    success: product ? true : false,
    product: product ? product : false
  })
})

const deleteVariant = asyncHandler(async (req,res)=>{
    const {pid} = req.params
    const {title, color, size, price} = req.body
    if(!(title || price || color || size)){
      return res.status(400).json({
        success: false,
        mes: "Missing inputs."
      })
    }
    const product = await Product.findById(pid)
    if(product.variants.length > 0){
       product.variants = product.variants.filter(
        el => el.title !== title &&
        el.price !== price && 
        el.color !== color && 
        el.size !== size 
      )
      await product.save()
    }
    return res.status(200).json({
      success: product ? true : false,
      deleleVariant: product ?  product : false
    })
})

const ratings = asyncHandler(async (req,res)=>{
  const {_id} = req.user
  const { star, pid, comment } = req.body
  if(!(star || comment || pid)){
    return res.status(400).json({
      success: false,
      mes: "Missing inputs."
    })
  }
  const product = await Product.findById(pid).select("ratings")
  const existingRateIndex = product.ratings.findIndex((el)=>el.postBy.toString() === _id.toString())
  if(existingRateIndex >= 0){
    product.ratings[existingRateIndex].star = +star
    product.ratings[existingRateIndex].comment = comment
    product.totalRatings = Math.round(product.ratings.reduce((total, item)=> total + +item.star, 0)/product.ratings.length)
    await product.save()
    return res.status(200).json({
      success: existingRateIndex ? true : false,
      product
    })
  }else{
    product.ratings.push({star: +star, postBy: _id, comment})
    product.totalRatings = Math.round(product.ratings.reduce((total, item)=> total + +item.star, 0)/product.ratings.length)
    await product.save()
  }
 
  await product.save()
  return res.status(200).json({
    success: true,
    product
  })
})

const interact = asyncHandler(async (req,res)=>{
  const {_id} = req.user
  const { pid, action } = req.params
  const product = await Product.findById(pid).select("likes dislikes").populate("likes.$.like", "firstname lastname").populate("dislikes.$.dislike", "firstname lastname")
  if(!product){
    return res.status(400).json({
      mes: "Product not found"
    })
  }
  const existingLikeIndex = product.likes.findIndex(el => el.like.toString() === _id.toString())
  const existingDislikeIndex = product.dislikes.findIndex(el => el.dislike.toString() === _id.toString())
  if(action === "like"){
    if(existingLikeIndex >= 0){
      product.likes.pop(_id)
    }else{
      if(existingDislikeIndex >= 0){
        product.dislikes.pop(_id)
      }
      product.likes.push({like: _id})
    }
  }else if(action === "dislike"){
    if(existingDislikeIndex >= 0){
      product.dislikes.pop(_id)
    }else{
      if(existingLikeIndex >= 0){
        product.likes.pop(_id)
      }
      product.dislikes.push({dislike: _id})
    }
  }else{
    return res.status(400).json({
      success: false,
      mes: "Action invalid"
    })
  }
  await product.save()
  return res.status(200).json({
    success: true,
    likes: product.likes,
    dislikes: product.dislikes,
  })
})
module.exports = { createProduct, getOne, getProducts, updateProduct, deleteProduct, updateImages, deleteImages, updateVariants, deleteProduct, deleteVariant, ratings, interact };