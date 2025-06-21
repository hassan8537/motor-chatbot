import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import "./SignIn.css"; 

export default function SignIn() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

    const handleSignIn = async () => {
        setError("");
          setLoading(true);

        if (!email || !password) {
            setError("Email and password are required.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/auth/signup&signin", // <-- Fixed URL
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                }
            );

            const data = await response.json();
            console.log("API Response:", data); // Debugging

            if (response.ok && data?.data?.SessionToken) {
                const sessionToken = data.data.SessionToken;

                // Set cookie (in development, secure should be false)
                Cookies.set("token", sessionToken, {
                    path: "/",
                    secure: false, // use true in production
                    sameSite: "Lax",
                });

                console.log("Stored token:", Cookies.get("token"));
                navigate("/landing");
            } else {
                setError(data?.message || "Invalid email or password.");
            }
        } catch (err) {
            console.error("Sign-in error:", err);
            setError("Something went wrong. Please try again.");
        } finally {
        setLoading(false);
    }
    };

    return (
        <div className="app-container sign-in-screen d-flex align-items-center justify-content-center vh-100 bg-dark">
            <div className="card shadow p-4 justify-content-center align-center" style={{ minWidth: "420px", maxWidth: "400px", height: '380px' }}>
                <h3 className="text-center mb-4 text-black">Sign In</h3>
                <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                    />
                </div>
                {error && <div className="alert alert-danger py-2">{error}</div>}
                <button onClick={handleSignIn}  disabled={loading} className="btn btn-dark text-white my-3 w-100">
                     {loading ? "Signing in..." : "Sign In"}
                </button>
            </div>
        </div>
    );
}
