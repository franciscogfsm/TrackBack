import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const token = searchParams.get("token");

        // Handle PKCE token format
        if (token && token.startsWith("pkce_")) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: "recovery",
          });

          if (error) {
            console.error("Error verifying PKCE token:", error);
            setMessage({
              type: "error",
              text: "Invalid or expired reset link. Please request a new one.",
            });
            setTimeout(
              () => navigate("/reset-password", { replace: true }),
              3000
            );
            return;
          }

          // If verification successful, we can proceed
          console.log("PKCE token verified successfully");
          return;
        }

        // Check if we have a valid session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("No valid session found:", sessionError);
          setMessage({
            type: "error",
            text: "Unable to verify your session. Please try again.",
          });
          setTimeout(
            () => navigate("/reset-password", { replace: true }),
            3000
          );
          return;
        }
      } catch (error) {
        console.error("Error in password reset:", error);
        setMessage({
          type: "error",
          text: "Something went wrong. Please try requesting a new password reset.",
        });
        setTimeout(() => navigate("/reset-password", { replace: true }), 3000);
      }
    };

    handlePasswordReset();
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Passwords do not match",
      });
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters long",
      });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Password updated successfully! Redirecting to login...",
      });

      // Sign out the user to clear the recovery session
      await supabase.auth.signOut();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (error: any) {
      console.error("Password update error:", error);
      setMessage({
        type: "error",
        text: error.message || "An error occurred while updating your password",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>

      <div className="max-w-md w-full relative">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-8 relative z-10">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 mb-6">
              <span className="text-4xl font-bold text-white">T</span>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              Set New Password
            </h2>
            <p className="text-base text-gray-600 max-w-sm mx-auto">
              Enter your new password below
            </p>
          </div>

          {message?.type === "error" ? (
            <div className="text-center">
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 mb-4">
                {message.text}
              </div>
              <p className="text-sm text-gray-500">
                You will be redirected to request a new password reset...
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm text-gray-900 placeholder-gray-400 bg-white/50"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm text-gray-900 placeholder-gray-400 bg-white/50"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              {message?.type === "success" && (
                <div className="bg-green-50 text-green-600 text-sm p-4 rounded-xl border border-green-100">
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-xl px-4 py-3.5 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Copyright */}
        <p className="mt-8 text-center text-sm text-white/90 font-medium">
          Designed & Developed by Francisco Martins © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
