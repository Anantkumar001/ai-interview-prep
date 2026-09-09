const mongoose=require("mongoose")
const blacklistSchema=new mongoose.Schema({
    token:{
        type:String,
        required:[true,"Token is required"]
    },
    blacklistedAt:{
        type:Date,
        default:Date.now
    }
})

const blacklistModel=mongoose.model("blacklist",blacklistSchema)
module.exports=blacklistModel