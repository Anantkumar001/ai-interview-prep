const { Router } = require('express')
const authcontroller=require("../controllers/auth.controller")
const authuser=require("../middleware/auth.middleware")

const authrouter=Router()

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
authrouter.post("/register",authcontroller.registerUser)

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
authrouter.post("/login",authcontroller.loginUser)


/**
 * @route GET /api/auth/logout
 * @desc Logout a user
 * @access Public
 */
authrouter.get("/logout",authcontroller.logoutUser)

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 * @access Private
 */
authrouter.get("/get-me",authuser,authcontroller.getmecontroller)

module.exports=authrouter