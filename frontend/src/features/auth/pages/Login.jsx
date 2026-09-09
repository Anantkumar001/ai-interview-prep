import React from 'react'
import { useNavigate } from 'react-router-dom';
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth.js';

const Login = () => {
    const { loading, handleLogin } = useAuth();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");

    const navigate = useNavigate();
    const handlesubmit=async (e)=>{
        e.preventDefault();
        // Get the email and password values from the form
        const email = e.target.email.value;
        const password = e.target.password.value;
        // Call the handleLogin function with the form values
        await handleLogin(email, password);
        navigate("/");   
    }
    if(loading){
        return <p>Loading...</p>
    }
  return (
    <main>
        <div className="form-container">
            <h1>Login</h1>
            <form onSubmit={handlesubmit}>
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input onChange={(e) => setEmail(e.target.value)} type="email" id="email" placeholder='Enter Email'/>
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input onChange={(e) => setPassword(e.target.value)} type="password" id="password" placeholder='Enter Password'/>
                </div>
                <button type="submit" className="button primary-button">Login</button>
            </form>
            <p>Don't have an account? <button className="button secondary-button" onClick={() => navigate('/register')}>Register</button></p>
        </div>
    </main>
  )
}

export default Login
