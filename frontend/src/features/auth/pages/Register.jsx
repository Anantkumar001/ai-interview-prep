import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';


const Register = () => {
    const navigate = useNavigate();
    const [username, setUsername] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");

    const { loading, handleRegister } = useAuth();


    const handlesubmit=async (e)=>{
        e.preventDefault();
        await handleRegister(username, email, password);
        navigate("/");
    }

    if(loading){
        return <p>Loading...</p>
    }
  return (
    <main>
        <div className="form-container">
            <h1>Register</h1>
            <form onSubmit={handlesubmit}>
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input onChange={(e)=>setEmail(e.target.value)} type="email" id="email" placeholder='Enter email'/>
                </div>
                <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <input onChange={(e)=>setUsername(e.target.value)} type="text" id="username" placeholder='Enter username'/>
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input onChange={(e)=>setPassword(e.target.value)} type="password" id="password" placeholder='Enter password'/>
                </div>
                <button type="submit" className="button primary-button">Register</button>
            </form>
            <p>Already have an account? <button className="button secondary-button" onClick={() => navigate('/login')}>Login</button></p>
        </div>
    </main>
  )
}

export default Register
