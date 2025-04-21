import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  UserPlus,
  Activity,
  BarChart2,
  Users,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import clsx from "clsx";

const features = [
  {
    icon: <Activity className="w-6 h-6" />,
    title: "Real-time Monitoring",
    description:
      "Track athlete performance and wellness metrics as they happen",
  },
  {
    icon: <BarChart2 className="w-6 h-6" />,
    title: "Advanced Analytics",
    description: "Gain insights through comprehensive data visualization",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Team Management",
    description: "Efficiently manage your athletes and their training programs",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Progress Tracking",
    description: "Monitor improvements and identify areas for development",
  },
];

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"athlete" | "manager">("athlete");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Attempt to sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        console.error("Authentication error:", authError);
        setError(authError.message);
        return;
      }

      if (!authData.user) {
        console.error("No user data returned from authentication");
        setError("Failed to create user account");
        return;
      }

      // Create profile regardless of email confirmation
      const { data: profile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: fullName,
          role: role,
          email: email,
          created_at: new Date().toISOString(),
          manager_id: null, // Explicitly set to null for new users
          avatar_url: null, // Explicitly set to null for new users
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating profile:", insertError);
        // If the error is about duplicate key, it means the trigger already created the profile
        if (insertError.code === "23505") {
          // Fetch the profile instead
          const { data: existingProfile, error: fetchError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authData.user.id)
            .single();

          if (fetchError) {
            console.error("Error fetching profile:", fetchError);
            setError("Failed to fetch user profile");
            await supabase.auth.signOut();
            return;
          }

          if (!existingProfile) {
            console.error("No profile found for user:", authData.user.id);
            setError("Failed to create user profile");
            await supabase.auth.signOut();
            return;
          }

          localStorage.setItem("userProfile", JSON.stringify(existingProfile));
        } else {
          // If it's not a duplicate key error, handle it as a failure
          setError("Failed to create user profile");
          await supabase.auth.signOut();
          return;
        }
      } else {
        localStorage.setItem("userProfile", JSON.stringify(profile));
      }

      // If the user is a manager, create initial daily form status
      if (role === "manager") {
        // Get current date in YYYY-MM-DD format
        const today = new Date();
        const formattedDate = today.toISOString().split("T")[0];

        // Set default open time (00:00) and close time (23:59) in proper time format
        const defaultOpenTime = "00:00:00+00";
        const defaultCloseTime = "23:59:59+00";

        const { error: formStatusError } = await supabase
          .from("daily_form_status")
          .insert({
            manager_id: authData.user.id,
            date: formattedDate,
            is_open: true,
            created_at: today.toISOString(),
            open_time: defaultOpenTime,
            close_time: defaultCloseTime,
          });

        if (formStatusError) {
          console.error("Error creating initial form status:", formStatusError);
          // Don't block registration if this fails
        }
      }

      // Check if email confirmation is required
      if (authData.session === null) {
        navigate("/login?registered=true&confirmation=pending");
      } else {
        navigate("/login?registered=true");
      }
    } catch (err) {
      console.error("Unexpected error during registration:", err);
      setError("An unexpected error occurred");
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

      <div className="flex-1 flex items-start justify-center py-20 px-4">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left side - App info (desktop only) */}
          <div className="hidden lg:block text-white p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg transform rotate-12 transition-transform hover:rotate-0">
                <span className="text-blue-600 text-2xl font-bold">T</span>
              </div>
              <h1 className="text-3xl font-bold">TrackBack</h1>
            </div>

            <p className="text-xl text-blue-100 mb-12">
              Join our platform and take your athletic journey to the next level
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-6 transform transition-all duration-300 hover:scale-105 hover:bg-white/20"
                >
                  <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-blue-100 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Registration form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-12 transition-transform hover:rotate-0">
                    <span className="text-blue-600 text-2xl font-bold">T</span>
                  </div>
                  <h1 className="text-3xl font-bold">TrackBack</h1>
                </div>
                <p className="text-gray-600">Create your account</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    I am a...
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRole("athlete")}
                      className={clsx(
                        "px-4 py-2 rounded-xl font-medium transition-all",
                        role === "athlete"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      Athlete
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("manager")}
                      className={clsx(
                        "px-4 py-2 rounded-xl font-medium transition-all",
                        role === "manager"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      Coach/Manager
                    </button>
                  </div>
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
                    "w-full py-2 px-4 rounded-xl text-white font-medium transition-all",
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  By signing up, you agree to TrackBack's{" "}
                  <Link
                    to="/terms-of-service"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy-policy"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  © {new Date().getFullYear()} TrackBack. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
