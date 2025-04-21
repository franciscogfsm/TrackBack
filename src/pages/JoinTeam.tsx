import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Loader2, X, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { User } from "@supabase/supabase-js";

// Verify Supabase client initialization
console.log("Supabase client config:", {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
});

// Error boundary component
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="text-center text-gray-600">{error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

const JoinTeam = () => {
  const { invitationCode: urlCode } = useParams();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get("code");
  const invitationCode = urlCode || queryCode;

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [success, setSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [managerName, setManagerName] = useState<string>("");
  const [shouldRedirect, setShouldRedirect] = useState<{
    path: string;
    message: string;
  } | null>(null);

  // Handle redirects in a separate effect
  useEffect(() => {
    if (shouldRedirect) {
      toast.error(shouldRedirect.message);
      navigate(shouldRedirect.path);
    }
  }, [shouldRedirect, navigate]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (invitationCode) {
          localStorage.setItem("pendingInvitation", invitationCode);
        }
        setShouldRedirect({
          path: `/login?redirect=/join?code=${invitationCode}`,
          message: "Please log in to join the team",
        });
        return;
      }

      // Get user's profile to check role and existing manager
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, manager_id")
        .eq("id", user.id)
        .single();

      if (profile?.role === "manager") {
        setShouldRedirect({
          path: "/manager/dashboard",
          message: "Managers cannot join other teams",
        });
        return;
      }

      if (profile?.manager_id) {
        setShouldRedirect({
          path: "/athlete/dashboard",
          message: "You are already part of a team",
        });
        return;
      }

      setUser(user);
    };
    checkUser();
  }, [invitationCode]);

  useEffect(() => {
    const processInvitation = async () => {
      if (!user || !invitationCode) return;

      setIsLoading(true);
      try {
        console.log("Processing invitation with code:", invitationCode);

        // First get the invitation details
        const { data: invitation, error: invitationError } = await supabase
          .from("manager_invitations")
          .select("*")
          .eq("invitation_code", invitationCode)
          .single();

        console.log("Invitation query result:", {
          invitation,
          invitationError,
        });

        if (invitationError || !invitation) {
          console.error("Invitation error:", invitationError);
          setShouldRedirect({
            path: "/login",
            message: "Invalid invitation code",
          });
          return;
        }

        // Then get the manager's profile separately
        const { data: managerProfile, error: managerError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", invitation.manager_id)
          .single();

        if (managerError || !managerProfile) {
          console.error("Manager profile error:", managerError);
          toast.error("Could not find manager information");
          return;
        }

        setManagerName(managerProfile.full_name || "your manager");

        // Update athlete's profile with manager connection
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            manager_id: invitation.manager_id,
          })
          .eq("id", user.id);

        console.log("Profile update result:", { profileError });

        if (profileError) {
          console.error("Profile update error:", profileError);
          toast.error("Failed to update profile");
          return;
        }

        // Create initial metrics record for today
        const today = new Date().toISOString().split("T")[0];
        const { error: metricsError } = await supabase
          .from("daily_metrics")
          .insert([
            {
              athlete_id: user.id,
              date: today,
              sleep_hours: 0,
              stress_level: 0,
              fatigue_level: 0,
              soreness_level: 0,
              nutrition_rating: 0,
              notes: "",
            },
          ])
          .select()
          .single();

        if (metricsError) {
          console.error("Failed to create initial metrics:", metricsError);
        }

        toast.success(
          `Successfully joined ${managerProfile.full_name}'s team!`
        );
        setSuccess(true);
      } catch (error) {
        console.error("Error processing invitation:", error);
        toast.error("An unexpected error occurred");
        // Attempt to revert any changes
        if (user.id) {
          await supabase
            .from("profiles")
            .update({ manager_id: null })
            .eq("id", user.id);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      processInvitation();
    }
  }, [user, invitationCode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success) {
      timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            // Force reload the page when redirecting to ensure fresh data
            window.location.href = "/athlete/dashboard";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [success]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-lg font-medium text-gray-900">
              Processing invitation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Successfully Joined Team!
            </h2>
            <p className="text-center text-gray-600">
              You have joined {managerName}'s team. Redirecting to your
              dashboard in {redirectCountdown} seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default JoinTeam;
