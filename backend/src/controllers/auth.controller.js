const usermodel=require("../models/user.model")
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")
const blacklistModel=require("../models/blacklist.model")

/**
 * @name Registers a new user 
 * @description This function handles the registration of a new user. It receives the username, email, and password from the request body, creates a new user in the database, and returns a success response with the created user. If there is an error during registration (e.g., validation error, duplicate email), it returns an error response with the error message.
 * @route POST /api/auth/register
 * @access Public
 */

const registerUser=async (req,res)=>{
    const {username,email,password}=req.body

    if(!username || !email || !password){
        return res.status(400).json({error:"All fields are required"})
    }
    const isusernameExist=await usermodel.findOne({
        $or:[{username:username},{email:email}]
    })
    if(isusernameExist){
        return res.status(400).json({error:"Username or email already exists"})
    }
    const hashedPassword=await bcrypt.hash(password,10)
    const newUser=new usermodel({
        username,
        email,
        password:hashedPassword
    })
    await newUser.save()
    const token=jwt.sign({id:newUser._id},process.env.JWT_SECRET,{expiresIn:"1d"})
    
    res.cookie("token",token).status(201).json({
        message:"User registered successfully",
        user:{
            id:newUser._id,
            username:newUser.username,
            email:newUser.email
        }
    })
}  

const loginUser=async (req,res)=>{
    const {email,password}=req.body
    if(!email || !password){
        return res.status(400).json({error:"All fields are required"})
    }
    const user=await usermodel.findOne({email})
    if(!user){
        return res.status(400).json({error:"Invalid email or password"})
    }
    const isMatch=await bcrypt.compare(password,user.password)
    if(!isMatch){
        return res.status(400).json({error:"Invalid email or password"})
    }
    const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:"1d"})
    res.cookie("token",token).status(200).json({
        message:"User logged in successfully",
        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
    })
}

async function logoutUser(req,res){
    const token=req.cookies?.token
    if(!token){
        return res.status(400).json({error:"User already logged out"})
    }
    await blacklistModel.create({token})
    res.clearCookie("token").status(200).json({message:"User logged out successfully"})
}

async function getmecontroller(req,res){
    const user=await usermodel.findById(req.user.id)
    if(!user){
        return res.status(404).json({error:"User not found"})
    }
    res.status(200).json({
        id:user._id,
        username:user.username,
        email:user.email
    })
}
module.exports={registerUser,loginUser,logoutUser,getmecontroller}