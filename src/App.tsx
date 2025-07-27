import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "./lib/database.types";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AthleteDashboard from "./pages/AthleteDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import Statistics from "./pages/Statistics";
import Records from "./pages/Records";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import JoinTeam from "./pages/JoinTeam";
import Landing from "./pages/Landing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

// Protected Route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Join route handler component (unused - keeping for potential future use)
// function JoinRouteHandler({ user }: { user: User | null }) {
//   const [searchParams] = useSearchParams();
//   const code = searchParams.get("code");

//   if (!user) {
//     return (
//       <Navigate
//         to={`/login?redirect=/join${code ? `?code=${code}` : ""}`}
//         replace
//       />
//     );
//   }

//   return <JoinTeam />;
// }

// Dashboard redirect component
function DashboardRedirect() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (profile?.role === "athlete") {
    return <AthleteDashboard profile={profile} />;
  } else if (profile?.role === "manager") {
    return <ManagerDashboard profile={profile} />;
  }

  return <Navigate to="/join-team" replace />;
}

// Protected component wrapper that includes profile
function ProtectedComponent({
  children,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Profile fetch error:", error.message);
        return null;
      }

      if (!data) {
        console.log("No profile found for user:", userId);
        // Try to create profile if it doesn't exist
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              email: userData.user.email,
              full_name: userData.user.user_metadata.full_name || "",
              role: userData.user.user_metadata.role || "athlete",
              created_at: new Date().toISOString(),
              manager_id: null,
              avatar_url: null,
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating missing profile:", createError);
            return null;
          }

          return newProfile;
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error("Unexpected error in fetchProfile:", error);
      return null;
    }
  }, []);

  // Handle auth state changes
  const handleAuthChange = useCallback(
    async (userId: string | null) => {
      setLoading(true);

      try {
        if (!userId) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const profileData = await fetchProfile(userId);

        if (profileData) {
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Error in handleAuthChange:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    },
    [fetchProfile]
  );

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session check error:", error);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
          } else {
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Unexpected error in session check:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignore certain events that might trigger logout
      const ignoredEvents = ["STORAGE", "INITIAL_SESSION", "TOKEN_REFRESHED"];
      if (ignoredEvents.includes(event)) {
        return;
      }

      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        handleAuthChange(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Initial check
    checkSession();

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, handleAuthChange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/join" element={<JoinTeam />} />
        <Route path="/join/:invitationCode" element={<JoinTeam />} />
        <Route path="/" element={user ? <DashboardRedirect /> : <Landing />} />
        <Route
          path="/login"
          element={user ? <DashboardRedirect /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <DashboardRedirect /> : <Register />}
        />
        <Route
          path="/reset-password"
          element={user ? <DashboardRedirect /> : <ResetPassword />}
        />

        {/* Protected routes */}
        <Route
          path="/update-password"
          element={
            <ProtectedRoute>
              <UpdatePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/join-team"
          element={
            <ProtectedRoute>
              <JoinTeam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/athlete/dashboard"
          element={
            profile ? (
              <ProtectedComponent profile={profile}>
                <AthleteDashboard profile={profile} />
              </ProtectedComponent>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/manager/dashboard"
          element={
            profile ? (
              <ProtectedComponent profile={profile}>
                <ManagerDashboard profile={profile} />
              </ProtectedComponent>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/statistics"
          element={
            profile ? (
              <ProtectedComponent profile={profile}>
                <Statistics profile={profile} />
              </ProtectedComponent>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/records"
          element={
            <ProtectedRoute>
              <Records />
            </ProtectedRoute>
          }
        />

        {/* Dashboard route that redirects based on role */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Legal routes */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
