import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import "./SignIn.css";
import BASE_URL from "../config";

// Constants
const COOKIE_OPTIONS = {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax",
  expires: 30, // 30 days
};

const API_ENDPOINTS = {
  SIGNIN: `${BASE_URL}/api/v1/auth/signin`,
};

// Custom hook for form validation
const useFormValidation = (email, password) => {
  return useMemo(() => {
    const errors = {};

    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  }, [email, password]);
};

// Custom hook for authentication
const useAuth = () => {
  const navigate = useNavigate();

  const signIn = useCallback(async (email, password) => {
    const response = await fetch(API_ENDPOINTS.SIGNIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    if (!data?.success || !data?.data?.token) {
      throw new Error("Invalid response format from server");
    }

    return data;
  }, []);

  const handleSuccessfulSignIn = useCallback(
    data => {
      const { token, expiresAt, user } = data.data;

      // Calculate expiration date
      const expirationDate = expiresAt
        ? new Date(expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Store token with proper expiration
      Cookies.set("token", token, {
        ...COOKIE_OPTIONS,
        expires: expirationDate,
      });

      // Store user info if needed
      if (user) {
        Cookies.set(
          "user",
          JSON.stringify({
            userId: user.UserId,
            email: user.Email,
            role: user.Role,
          }),
          {
            ...COOKIE_OPTIONS,
            expires: expirationDate,
          }
        );
      }

      // Navigate to home
      navigate("/home", { replace: true });
    },
    [navigate]
  );

  return { signIn, handleSuccessfulSignIn };
};

export default function SignIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const { signIn, handleSuccessfulSignIn } = useAuth();
  const { errors, isValid } = useFormValidation(
    formData.email,
    formData.password
  );

  // Check if user is already logged in
  useEffect(() => {
    const existingToken = Cookies.get("token");
    if (existingToken) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  // Handle input changes
  const handleInputChange = useCallback(
    field => e => {
      const value = e.target.value;
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user starts typing
      if (error) {
        setError("");
      }
    },
    [error]
  );

  // Handle input blur for validation
  const handleInputBlur = useCallback(
    field => () => {
      setTouched(prev => ({
        ...prev,
        [field]: true,
      }));
    },
    []
  );

  // Handle form submission
  const handleSignIn = useCallback(
    async e => {
      e?.preventDefault();

      // Mark all fields as touched
      setTouched({ email: true, password: true });

      if (!isValid) {
        const firstError = errors.email || errors.password;
        setError(firstError);
        return;
      }

      setError("");
      setLoading(true);

      try {
        const data = await signIn(formData.email, formData.password);
        handleSuccessfulSignIn(data);
      } catch (err) {
        console.error("Sign-in error:", err);

        // Handle specific error types
        if (err.message.includes("401") || err.message.includes("Invalid")) {
          setError("Invalid email or password. Please check your credentials.");
        } else if (err.message.includes("Network")) {
          setError(
            "Network error. Please check your connection and try again."
          );
        } else {
          setError(err.message || "Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [isValid, errors, formData, signIn, handleSuccessfulSignIn]
  );

  // Handle Enter key press
  const handleKeyPress = useCallback(
    e => {
      if (e.key === "Enter" && !loading) {
        handleSignIn(e);
      }
    },
    [handleSignIn, loading]
  );

  // Get field error for display
  const getFieldError = useCallback(
    field => {
      return touched[field] && errors[field] ? errors[field] : "";
    },
    [touched, errors]
  );

  return (
    <div className="app-container sign-in-screen d-flex align-items-center justify-content-center vh-100 bg-dark">
      <div
        className="card shadow p-4 justify-content-center align-center"
        style={{ minWidth: "420px", maxWidth: "400px", minHeight: "380px" }}
      >
        <h3 className="text-center mb-4 text-black">Sign In</h3>

        <form onSubmit={handleSignIn} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email *
            </label>
            <input
              id="email"
              type="email"
              className={`form-control ${
                getFieldError("email") ? "is-invalid" : ""
              }`}
              value={formData.email}
              onChange={handleInputChange("email")}
              onBlur={handleInputBlur("email")}
              onKeyPress={handleKeyPress}
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="email"
              required
            />
            {getFieldError("email") && (
              <div className="invalid-feedback">{getFieldError("email")}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password *
            </label>
            <input
              id="password"
              type="password"
              className={`form-control ${
                getFieldError("password") ? "is-invalid" : ""
              }`}
              value={formData.password}
              onChange={handleInputChange("password")}
              onBlur={handleInputBlur("password")}
              onKeyPress={handleKeyPress}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
              required
            />
            {getFieldError("password") && (
              <div className="invalid-feedback">
                {getFieldError("password")}
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !formData.email || !formData.password}
            className="btn btn-dark text-white my-3 w-100"
            style={{
              opacity:
                loading || !formData.email || !formData.password ? 0.6 : 1,
            }}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* <div className="text-center mt-3">
          <small className="text-muted">
            Don't have an account?{" "}
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => navigate("/signup")}
              disabled={loading}
            >
              Sign up here
            </button>
          </small>
        </div> */}
      </div>
    </div>
  );
}
