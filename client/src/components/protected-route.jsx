import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from '../Authorisation/AuthProvider';

const ProtectedRoute = ({children}) => {
    const { isAuthenticated, loading } = useContext(AuthContext);
    const [loadingTimeout, setLoadingTimeout] = useState(false);

    // Add timeout to prevent infinite loading state
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                console.warn('⚠️ Loading timeout - auth verification took too long');
                setLoadingTimeout(true);
            }, 10000); // 10 second timeout

            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (loading && !loadingTimeout) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-500"></div>
                    <p className="text-gray-600 text-sm">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    return children;
}

export default ProtectedRoute;