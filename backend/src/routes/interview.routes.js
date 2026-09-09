const express=require("express")
const authuser=require("../middleware/auth.middleware")

const interviewrouter=express.Router()
const interviewController=require("../controllers/interview.controller")

const upload=require("../middleware/file.middleware")

/**
 * interview report schema
 * @description generate new interview report based on user self description, job description and resume
 * @access private
 * @route POST /api/interview/report
 * 
 */

interviewrouter.post("/report", authuser, upload.single("resume"), interviewController.generateInterviewReportController)

/**
 * @description get interview report by interviewId
 * @access private
 * @route GET /api/interview/report/:interviewId
 */
interviewrouter.get("/report/:interviewId", authuser, interviewController.getInterviewReportByIdController)

/**
 * @description get all interview reports of the user
 * @access private
 * @route GET /api/interview/reports
 */
interviewrouter.get("/", authuser, interviewController.getAllInterviewReportsController)

module.exports=interviewrouter