const express=require("express")
const cookieParser=require("cookie-parser")
const app=express()
const cors=require("cors")
app.use(cors({
    origin:"http://localhost:5173", 
    credentials:true
}))

app.use(express.json())
app.use(cookieParser())

//require all the routes here
const authrouter=require("./routes/auth.routes")
const interviewrouter=require("./routes/interview.routes")

//use the routes here

app.use("/api/auth",authrouter)
app.use("/api/interview",interviewrouter)

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public   
 */
module.exports=app