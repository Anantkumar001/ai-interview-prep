const mongoose=require("mongoose")

async function connectToDB() {
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log("connected to db")
    }catch(err){
        console.error("Database connection error:", err)
        process.exit(1)
    }
}
module.exports=connectToDB