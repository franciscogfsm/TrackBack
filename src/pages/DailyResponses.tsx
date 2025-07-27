import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/database.types";
import ProfilePicture from "../components/ProfilePicture";
import {
  Calendar as CalendarIcon,
  Home,
  Activity,
  Trophy,
  Menu,
  X,
  LogOut,
  Filter,
  Download,
} from "lucide-react";

interface DailyResponse {
  id: string;
  athlete_id: string;
  metric_id: string;
  rating_value: number | null;
  text_value: string | null;
  date: string;
  created_at: string;
  athlete?: Profile;
  custom_metrics?: {
    id: string;
    title: string;
    type: string;
    description?: string;
  };
  profiles?: Profile;
}

export default function DailyResponses() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [responses, setResponses] = useState<DailyResponse[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedAthlete, setSelectedAthlete] = useState<string>("all");
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [todayResponsesCount, setTodayResponsesCount] = useState<number>(0);
  const [showNotification, setShowNotification] = useState<boolean>(false);

  // Test function to simulate notification
  const testNotification = () => {
    setTodayResponsesCount(3);
    setShowNotification(true);
    console.log("Test notification triggered with count: 3");
  };

  // Helper function to get the correct avatar URL
  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return "https://via.placeholder.com/48";

    // If it's already a full URL (starts with http), return as is
    if (avatarUrl.startsWith("http")) {
      return avatarUrl;
    }

    // If it's a file path, convert to public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(avatarUrl);
    return publicUrl;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const fetchTodayResponsesCount = async (userId: string, userRole: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      console.log("Fetching today's responses for date:", today);
      console.log("User role:", userRole, "User ID:", userId);

      let query = supabase
        .from("metric_responses")
        .select("id", { count: "exact" })
        .eq("date", today);

      if (userRole === "manager") {
        // Get responses from all athletes managed by this manager
        const { data: managedAthletes } = await supabase
          .from("profiles")
          .select("id")
          .eq("manager_id", userId)
          .eq("role", "athlete");

        console.log("Managed athletes:", managedAthletes);

        if (managedAthletes && managedAthletes.length > 0) {
          const athleteIds = managedAthletes.map((a) => a.id);
          query = query.in("athlete_id", athleteIds);
          console.log("Filtering for athlete IDs:", athleteIds);
        }
      } else if (userRole === "athlete") {
        query = query.eq("athlete_id", userId);
      }

      const { count, error } = await query;

      if (error) {
        console.error("Error fetching today's responses count:", error);
      } else {
        console.log("Today's response count:", count);
        setTodayResponsesCount(count || 0);
        setShowNotification((count || 0) > 0);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      console.log("=== GET USER DEBUG ===");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("User from auth:", user);
      setUser(user);

      if (user) {
        console.log("User found, fetching profile...");
        // Get profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        console.log("Profile data:", profileData);
        setProfile(profileData);

        // If user is a manager, get their athletes
        if (profileData?.role === "manager") {
          console.log("User is manager, fetching athletes...");
          const { data: athletesData } = await supabase
            .from("profiles")
            .select("*")
            .eq("manager_id", user.id)
            .eq("role", "athlete");

          console.log("Athletes data:", athletesData);
          setAthletes(athletesData || []);
          // Ensure selectedAthlete is set to "all" for managers
          setSelectedAthlete("all");
          console.log("About to call fetchDailyResponses...");
          fetchDailyResponses(user.id, profileData.role);
          fetchTodayResponsesCount(user.id, profileData.role);
        } else {
          console.log("User is athlete, calling fetch functions...");
          fetchDailyResponses(user.id, profileData?.role);
          fetchTodayResponsesCount(user.id, profileData?.role);
        }
      } else {
        console.log("No user found");
      }
      setLoading(false);
    };

    getUser();
  }, []);

  const fetchDailyResponses = async (userId: string, userRole: string) => {
    console.log("🚀 FETCH DAILY RESPONSES FUNCTION CALLED!");
    try {
      console.log("=== FETCH DAILY RESPONSES DEBUG ===");
      console.log("userId:", userId);
      console.log("userRole:", userRole);
      console.log("selectedDate:", selectedDate);
      console.log("selectedAthlete:", selectedAthlete);

      let query = supabase
        .from("metric_responses")
        .select(
          `
          *,
          custom_metrics(id, title, type, description),
          profiles!athlete_id(id, full_name, email, avatar_url)
        `
        )
        .order("date", { ascending: false });

      if (userRole === "athlete") {
        query = query.eq("athlete_id", userId);
        console.log("Applied athlete filter for userId:", userId);
      } else if (userRole === "manager") {
        // Get responses from all athletes managed by this manager
        const { data: managedAthletes } = await supabase
          .from("profiles")
          .select("id")
          .eq("manager_id", userId)
          .eq("role", "athlete");

        console.log("Managed athletes found:", managedAthletes);

        if (managedAthletes && managedAthletes.length > 0) {
          const athleteIds = managedAthletes.map((a) => a.id);
          query = query.in("athlete_id", athleteIds);
          console.log("Applied manager filter for athlete IDs:", athleteIds);
        } else {
          console.log(
            "No managed athletes found - no responses will be returned"
          );
        }
      }

      // Apply date filter if not "all"
      if (selectedDate) {
        query = query.eq("date", selectedDate);
        console.log("Applied date filter:", selectedDate);
      }

      // Apply athlete filter if not "all"
      if (selectedAthlete !== "all") {
        query = query.eq("athlete_id", selectedAthlete);
        console.log("Applied individual athlete filter:", selectedAthlete);
      }

      console.log("Executing query...");
      const { data, error } = await query;

      if (error) {
        console.error("Error fetching daily responses:", error);
      } else {
        console.log("Raw query result:", data);
        console.log("Number of responses found:", data?.length || 0);

        // Map the data to include athlete information properly
        const mappedData = (data || []).map((response: any) => ({
          ...response,
          athlete: response.profiles || null,
        }));
        console.log("Mapped data with athlete info:", mappedData);
        console.log("Sample athlete data:", mappedData[0]?.athlete);
        console.log("Sample avatar_url:", mappedData[0]?.athlete?.avatar_url);
        setResponses(mappedData);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchDailyResponses(user.id, profile.role);
      fetchTodayResponsesCount(user.id, profile.role);
    }
  }, [selectedDate, selectedAthlete, user, profile]);

  const getScoreColor = (score: number, reverse = false) => {
    if (reverse) {
      if (score <= 3) return "text-green-600 bg-green-50";
      if (score <= 6) return "text-yellow-600 bg-yellow-50";
      return "text-red-600 bg-red-50";
    } else {
      if (score >= 7) return "text-green-600 bg-green-50";
      if (score >= 4) return "text-yellow-600 bg-yellow-50";
      return "text-red-600 bg-red-50";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You need to be logged in to view daily responses.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200">
      {/* Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b bg-blue-50/90 border-blue-200/50 shadow-xl shadow-blue-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-lg">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-blue-900">
                  TrackBack
                </h1>
                <span className="text-xs font-medium text-blue-700">
                  Daily Responses
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-blue-700 hover:text-blue-900 hover:bg-blue-200/50"
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/records"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-blue-700 hover:text-blue-900 hover:bg-blue-200/50"
              >
                <Trophy className="h-4 w-4" />
                <span>Records</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-200/70 text-blue-900 shadow-sm relative">
                <CalendarIcon className="h-4 w-4" />
                <span>Daily Responses</span>
                {showNotification && todayResponsesCount > 0 && (
                  <div
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center cursor-pointer animate-pulse"
                    onClick={() => setShowNotification(false)}
                    title={`${todayResponsesCount} response${
                      todayResponsesCount !== 1 ? "s" : ""
                    } today`}
                  >
                    {todayResponsesCount > 9 ? "9+" : todayResponsesCount}
                  </div>
                )}
              </div>
              <Link
                to="/statistics"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-blue-700 hover:text-blue-900 hover:bg-blue-200/50"
              >
                <Activity className="h-4 w-4" />
                <span>Statistics</span>
              </Link>
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">
                  {profile?.full_name || profile?.email || "User"}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-200/80 text-blue-800">
                  {profile?.role || "Manager"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg transition-colors text-blue-700 hover:text-blue-900 hover:bg-blue-200/50"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 transition-colors text-gray-700 hover:bg-gray-100 focus:ring-gray-500"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Open menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 border-t backdrop-blur-xl bg-blue-50/95 border-blue-200/50">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium hover:bg-blue-100 text-gray-900"
              >
                <Home className="h-5 w-5 text-blue-600" />
                Dashboard
              </Link>
              <Link
                to="/records"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium hover:bg-blue-100 text-gray-900"
              >
                <Trophy className="h-5 w-5 text-blue-600" />
                Records
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium bg-blue-100 text-blue-900 relative">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                Daily Responses
                {showNotification && todayResponsesCount > 0 && (
                  <div
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center cursor-pointer animate-pulse"
                    onClick={() => setShowNotification(false)}
                    title={`${todayResponsesCount} response${
                      todayResponsesCount !== 1 ? "s" : ""
                    } today`}
                  >
                    {todayResponsesCount > 9 ? "9+" : todayResponsesCount}
                  </div>
                )}
              </div>
              <Link
                to="/statistics"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium hover:bg-blue-100 text-gray-900"
              >
                <Activity className="h-5 w-5 text-blue-600" />
                Statistics
              </Link>
              <div className="pt-4 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {profile?.full_name || profile?.email || "User"}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg transition-colors text-blue-700 hover:text-blue-900 hover:bg-blue-200/50"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Daily Responses
              </h1>
              <p className="text-gray-600">
                Track daily wellness metrics and athlete feedback
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {profile && profile.role === "manager" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Athlete
                </label>
                <select
                  value={selectedAthlete || "all"}
                  onChange={(e) => setSelectedAthlete(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Athletes</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.full_name || athlete.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedDate("");
                  setSelectedAthlete("all");
                }}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors mr-2"
              >
                Clear Filters
              </button>
              <button
                onClick={testNotification}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Test Notification
              </button>
            </div>
          </div>
        </div>

        {/* Responses List */}
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm">
          <div className="p-6 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Daily Responses ({responses.length})
              </h2>
              {responses.length > 0 && (
                <button className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
            </div>
          </div>

          {responses.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedAthlete === "all"
                  ? "No Responses Found"
                  : "Select an Athlete"}
              </h3>
              <p className="text-gray-600">
                {selectedAthlete === "all"
                  ? "No daily responses found for the selected filters."
                  : 'Choose an individual athlete or "All Athletes" from the dropdown above to view their daily responses and metrics.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-blue-100">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className="p-6 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        className="h-12 w-12 rounded-full object-cover transition-all duration-200"
                        src={getAvatarUrl(response.athlete?.avatar_url)}
                        alt={response.athlete?.full_name || "Unknown Athlete"}
                        loading="lazy"
                        onError={(e) => {
                          console.log(
                            "Image load error for:",
                            e.currentTarget.src,
                            "Original avatar_url:",
                            response.athlete?.avatar_url
                          );
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/48";
                        }}
                        onLoad={() => {
                          console.log(
                            "Image loaded successfully for:",
                            response.athlete?.full_name
                          );
                        }}
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {response.athlete?.full_name ||
                            response.athlete?.email ||
                            "Unknown Athlete"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(response.date).toLocaleDateString()} •
                          Submitted{" "}
                          {new Date(response.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 font-medium">
                        {response.custom_metrics?.title || "Unknown Metric"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {response.custom_metrics?.title || "Unknown Metric"}
                        </h4>
                        {response.custom_metrics?.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {response.custom_metrics.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {response.custom_metrics?.type === "rating" &&
                          response.rating_value && (
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                                response.rating_value
                              )}`}
                            >
                              {response.rating_value}/10
                            </span>
                          )}
                        {response.custom_metrics?.type === "text" &&
                          response.text_value && (
                            <div className="bg-white rounded-lg p-2 max-w-xs">
                              <p className="text-sm text-gray-700">
                                {response.text_value}
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
