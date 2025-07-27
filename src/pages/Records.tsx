import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/database.types";
import {
  Trophy,
  User,
  ChevronDown,
  Home,
  Activity,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import PersonalRecordsChart from "../components/PersonalRecordsChart";
import PersonalRecordsTable from "../components/PersonalRecordsTable";
import ManagerLeaderboard from "../components/ManagerLeaderboard";

export default function Records() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Personal Records state
  const [showPRModal, setShowPRModal] = useState(false);
  const [prForm, setPRForm] = useState({
    exercise: "",
    weight: 0,
    record_date: new Date().toISOString().split("T")[0],
    video_url: "",
    notes: "",
  });
  const [editingPRId, setEditingPRId] = useState<string | null>(null);
  const [prRefreshKey] = useState(0);

  // Selected athlete for viewing records
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Get profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(profileData);

        // If user is a manager, get their athletes
        if (profileData?.role === "manager") {
          const { data: athletesData } = await supabase
            .from("profiles")
            .select("*")
            .eq("manager_id", user.id)
            .eq("role", "athlete");

          setAthletes(athletesData || []);
        }
      }
      setLoading(false);
    };

    getUser();
  }, []);

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
            You need to be logged in to view records.
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
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-blue-900">
                  TrackBack
                </h1>
                <span className="text-xs font-medium text-blue-700">
                  Records
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
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-200/70 text-blue-900 shadow-sm">
                <Trophy className="h-4 w-4" />
                <span>Records</span>
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
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium bg-blue-100 text-blue-900">
                <Trophy className="h-5 w-5 text-blue-600" />
                Records
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
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Records</h1>
              <p className="text-gray-600">
                Team leaderboards and personal achievements
              </p>
            </div>
          </div>
        </div>

        {/* Team Leaderboard Section */}
        {profile.role === "manager" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Team Leaderboard
              </h2>
            </div>
            <ManagerLeaderboard managerId={user.id} refreshKey={0} />
          </div>
        )}

        {/* Personal Records Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Personal Records
              </h2>
            </div>
            {profile.role === "manager" && athletes.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  View records for:
                </label>
                <div className="relative">
                  <select
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select an athlete</option>
                    {athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.full_name || athlete.email}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {profile.role === "athlete" || selectedAthleteId ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Performance Report Cards
                  </h3>
                  <PersonalRecordsChart
                    athleteId={
                      profile.role === "athlete" ? user.id : selectedAthleteId
                    }
                    refreshKey={prRefreshKey}
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Records Overview
                  </h3>
                  <PersonalRecordsTable
                    athleteId={
                      profile.role === "athlete" ? user.id : selectedAthleteId
                    }
                    refreshKey={prRefreshKey}
                    showModal={showPRModal}
                    setShowModal={setShowPRModal}
                    form={prForm}
                    setForm={setPRForm}
                    editingId={editingPRId}
                    setEditingId={setEditingPRId}
                    canEdit={true}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select an Athlete
              </h3>
              <p className="text-gray-600">
                Choose an athlete from the dropdown above to view their personal
                records and performance metrics.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
