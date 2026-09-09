import { createContext, useState, useEffect } from "react";
import {getMe} from "./services/auth.api.js";

export const AuthContext = createContext({
    user: null,
    setUser: () => {},
    loading: false,
    setLoading: () => {}
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {   
                const userData = await getMe();
                setUser(userData);
            } catch (error) {
                console.error("Failed to fetch user:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);
    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading }}>
            {children}
        </AuthContext.Provider>
    );
};