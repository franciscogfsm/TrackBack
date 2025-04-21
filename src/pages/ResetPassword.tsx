import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);

      // Get the current origin (base URL) of the application
      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/update-password`,
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Password reset instructions have been sent to your email. The link will expire in 1 hour.",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text:
          error.message || "An error occurred while resetting your password",
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
              Reset Password
            </h2>
            <p className="text-base text-gray-600 max-w-sm mx-auto">
              Enter your email address and we'll send you instructions to reset
              your password. The reset link will be valid for 1 hour.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm text-gray-900 placeholder-gray-400 bg-white/50"
                placeholder="your@email.com"
              />
            </div>

            {message && (
              <div
                className={`${
                  message.type === "success"
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                } text-sm p-4 rounded-xl border ${
                  message.type === "success"
                    ? "border-green-100"
                    : "border-red-100"
                }`}
              >
                {message.text}
                {message.type === "success" && (
                  <div className="mt-2 text-sm text-gray-500">
                    Please check your spam folder if you don't see the email in
                    your inbox.
                  </div>
                )}
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
                  Sending...
                </div>
              ) : (
                "Send Reset Instructions"
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        </div>

        {/* Copyright */}
        <p className="mt-8 text-center text-sm text-white/90 font-medium">
          Designed & Developed by Francisco Martins © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
