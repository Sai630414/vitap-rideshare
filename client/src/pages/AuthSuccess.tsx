import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthSuccess() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [error, setError] = useState("");

  useEffect(() => {
    const completeLogin = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const token = params.get("token");

        if (!token) {
          throw new Error("Authentication token not found.");
        }

        // Save access token
        localStorage.setItem("token", token);

        // Fetch logged-in user
        await refreshUser();

        // Redirect
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Authentication failed.");

        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2500);
      }
    };

    completeLogin();
  }, [navigate, refreshUser]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600">
            Login Failed
          </h2>

          <p className="mt-4 text-gray-600">
            {error}
          </p>

          <p className="mt-2 text-sm text-gray-400">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="rounded-xl bg-white p-10 shadow-lg text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />

        <h2 className="mt-5 text-2xl font-bold">
          Signing you in...
        </h2>

        <p className="mt-2 text-gray-500">
          Please wait while we prepare your account.
        </p>
      </div>
    </div>
  );
}