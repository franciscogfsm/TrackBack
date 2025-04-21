import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  BarChart2,
  Shield,
  Lock,
  Trophy,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

const features = [
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Real-time Analytics",
    description: "Track performance metrics in real-time",
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: "Smart Insights",
    description: "AI-powered performance analysis",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Secure Platform",
    description: "Enterprise-grade data protection",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const joinCode = searchParams.get("code");
  const isRegistered = searchParams.get("registered") === "true";
  const isPendingConfirmation = searchParams.get("confirmation") === "pending";

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (redirectTo.startsWith("/join") && joinCode) {
        navigate(`${redirectTo}?code=${joinCode}`);
      } else {
        navigate(redirectTo);
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex flex-col">
      <button
        onClick={handleBackToHome}
        className="fixed top-4 left-4 text-white hover:text-blue-100 flex items-center gap-2 transition-colors z-50"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Home</span>
      </button>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Login form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-12 transition-transform hover:rotate-0">
                    <span className="text-blue-600 text-2xl font-bold">T</span>
                  </div>
                  <h1 className="text-3xl font-bold">TrackBack</h1>
                </div>
                {isRegistered ? (
                  <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl mb-6">
                    {isPendingConfirmation ? (
                      <>
                        <p className="font-medium">Check your email!</p>
                        <p className="text-sm">
                          Please verify your email address to continue.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">
                          Account created successfully!
                        </p>
                        <p className="text-sm">Please sign in to continue.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Welcome back
                    </h2>
                    <p className="text-gray-600">Sign in to your account</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <Link
                    to="/reset-password"
                    className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-800 rounded-xl p-3 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={clsx(
                    "w-full py-3 px-4 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2",
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Sign in</span>
                    </>
                  )}
                </button>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200/60"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 text-gray-600">
                      New to TrackBack?
                    </span>
                  </div>
                </div>

                <Link
                  to="/register"
                  className="w-full py-3 px-4 rounded-xl font-medium border border-gray-200/60 hover:border-blue-100 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 text-gray-700"
                >
                  Create an account
                </Link>
              </form>
            </div>
          </div>

          {/* Right side - Features */}
          <div className="hidden lg:block">
            <div className="text-white space-y-8">
              <h2 className="text-3xl font-bold mb-6">
                Unlock Your Athletic Potential
              </h2>
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 bg-white/10 backdrop-blur-sm p-6 rounded-xl transform transition-all duration-300 hover:scale-105"
                  >
                    <div className="bg-blue-500 p-3 rounded-lg">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-blue-100 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Animated Feature Highlight */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center animate-pulse">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white">
                          Premium Features
                        </h3>
                        <p className="text-blue-200 text-sm">
                          Unlock your potential
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-500/20 px-3 py-1 rounded-full">
                      <span className="text-sm text-blue-200">Pro</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-100">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>
                      <span>Real-time performance tracking</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-100">
                      <div
                        className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <span>AI-powered analytics dashboard</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-100">
                      <div
                        className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                      <span>Advanced team management tools</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-blue-200">
                          Enterprise-grade security
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-400 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
