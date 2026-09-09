const jwt=require("jsonwebtoken")
const blacklistModel=require("../models/blacklist.model")

async function authuser(req,res,next){
    const token=req.cookies?.token
    if(!token){
        return res.status(401).json({error:"Unauthorized"})
    }
    const isBlacklisted=await blacklistModel.findOne({token})
    if(isBlacklisted){
        return res.status(401).json({error:"Token is blacklisted"})
    }
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        req.user=decoded
        next()
    }
    catch(err){
        return res.status(401).json({error:"Invalid token"})
    }
}
module.exports=authuser