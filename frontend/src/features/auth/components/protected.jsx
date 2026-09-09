import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const Protected = ({ children }) => {
    const { loading, user } = useAuth();

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default Protected;