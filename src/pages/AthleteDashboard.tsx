import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type {
  Profile,
  CustomMetric,
  MetricResponseType as MetricResponse,
  DailyFormStatus,
  TrainingType,
  TrainingSession,
} from "../lib/database.types";
import { useNavigate } from "react-router-dom";
import { LogOut, Calendar, Upload, AlertCircle, Check } from "lucide-react";
import clsx from "clsx";
import ProfilePicture from "../components/ProfilePicture";
import styles from "./AthleteDashboard.module.css";

const TRAINING_TYPES: { value: TrainingType; label: string }[] = [
  { value: "regenerative", label: "Regenerative" },
  { value: "interval_metabolic", label: "Interval Metabolic" },
  { value: "technical_tactical", label: "Technical/Tactical" },
  { value: "strength_power", label: "Strength/Power" },
  { value: "speed_agility", label: "Speed/Agility" },
  { value: "mobility_regenerative", label: "Mobility & Regenerative" },
  { value: "competition", label: "Competition" },
  { value: "injury_prevention", label: "Injury Prevention" },
  { value: "other_activity", label: "Other Activity" },
  { value: "travel", label: "Travel" },
];

interface TrainingSessionForm {
  training_type: TrainingType;
  rpe: number;
  duration: number;
  submitted?: boolean;
}

interface Props {
  profile: Profile;
}

interface NoTrainingModalProps {
  isOpen: boolean;
  onConfirm: (sessionType: "AM" | "PM" | "ALL") => void;
  onCancel: () => void;
}

const RatingInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={clsx(
            "w-14 h-14 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 text-lg sm:text-base font-medium",
            value === rating
              ? "bg-blue-500 text-white shadow-md transform scale-105 ring-2 ring-blue-300"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 active:scale-95"
          )}
        >
          {rating}
        </button>
      ))}
    </div>
  );
};

const RPEInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
        <button
          key={rpe}
          type="button"
          onClick={() => onChange(rpe)}
          className={clsx(
            "w-12 h-12 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all duration-200 text-base sm:text-sm",
            value === rpe
              ? "bg-blue-500 text-white shadow-md transform scale-105"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105"
          )}
        >
          {rpe}
        </button>
      ))}
    </div>
  );
};

const NoTrainingModal = ({
  isOpen,
  onConfirm,
  onCancel,
}: NoTrainingModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Training Sessions Recorded
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            You haven't recorded any training sessions for today. Are you sure
            you didn't train at all?
          </p>
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-blue-700">
              If you did train, click "Go Back" and look for the highlighted
              training sections:
              <span className="block mt-2 font-medium">
                ↳ Morning Session (AM)
              </span>
              <span className="block mt-1 font-medium">
                ↳ Afternoon Session (PM)
              </span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-center gap-3">
            <button
              onClick={() => onConfirm("AM")}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              Yes, Submit Without Training
            </button>
            <button
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add these helper functions at the top level
const getLocalDate = () => {
  const now = new Date();
  return now.toLocaleDateString("en-CA"); // Returns YYYY-MM-DD in local timezone
};

const formatDateForDisplay = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function AthleteDashboard({ profile: initialProfile }: Props) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [responses, setResponses] = useState<Record<string, MetricResponse>>(
    {}
  );
  const [formStatus, setFormStatus] = useState<DailyFormStatus | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(
    []
  );
  const [amSession, setAmSession] = useState<TrainingSessionForm>({
    training_type: "regenerative",
    rpe: 0,
    duration: 0,
    submitted: false,
  });
  const [pmSession, setPmSession] = useState<TrainingSessionForm>({
    training_type: "regenerative",
    rpe: 0,
    duration: 0,
    submitted: false,
  });
  const [localResponses, setLocalResponses] = useState<
    Record<string, { rating_value?: number; text_value?: string }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmittedAll, setHasSubmittedAll] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [lastMetricsFetch, setLastMetricsFetch] = useState<Date | null>(null);
  const METRICS_CACHE_DURATION = 1000 * 60 * 60; // 1 hour
  const [showPhotoModal, setShowPhotoModal] = useState(true);
  const [showNoTrainingModal, setShowNoTrainingModal] = useState(false);
  const [highlightTraining, setHighlightTraining] = useState(false);
  const [metricsSubmitted, setMetricsSubmitted] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
    show: boolean;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message, show: true });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  useEffect(() => {
    if (!profile?.id) {
      console.log("No profile ID available");
      return;
    }

    const fetchInitialData = async () => {
      try {
        console.log("Starting initial data fetch...");
        setLoading(true);

        // Check if metrics were already submitted today
        if (profile.manager_id) {
          const { data: responsesData } = await supabase
            .from("metric_responses")
            .select("*")
            .eq("date", selectedDate)
            .eq("athlete_id", profile.id);

          setMetricsSubmitted(responsesData ? responsesData.length > 0 : false);
        }

        // Fetch form status - updated to get the latest record
        if (profile.manager_id) {
          const { data: formStatusData, error: formStatusError } =
            await supabase
              .from("daily_form_status")
              .select("*")
              .eq("manager_id", profile.manager_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

          if (formStatusError && formStatusError.code !== "PGRST116") {
            console.error("Error fetching form status:", formStatusError);
          } else {
            console.log("Form status data:", formStatusData);
            setFormStatus(formStatusData || null);
          }
        } else {
          // If no manager assigned yet, set form status to null
          setFormStatus(null);
        }

        // Fetch training sessions with proper type handling
        const { data: sessionsResponse } = await supabase
          .from("training_sessions")
          .select("*")
          .eq("athlete_id", profile.id)
          .eq("date", selectedDate);

        const sessionsData = (sessionsResponse || []) as TrainingSession[];
        setTrainingSessions(sessionsData);

        // Set AM/PM session forms if they exist
        const amSessionData = sessionsData.find((s) => s.session === "AM");
        if (amSessionData) {
          setAmSession({
            training_type: amSessionData.training_type as TrainingType,
            rpe: amSessionData.rpe,
            duration: amSessionData.duration,
            submitted: true,
          });
        }

        const pmSessionData = sessionsData.find((s) => s.session === "PM");
        if (pmSessionData) {
          setPmSession({
            training_type: pmSessionData.training_type as TrainingType,
            rpe: pmSessionData.rpe,
            duration: pmSessionData.duration,
            submitted: true,
          });
        }

        // Only fetch metrics if they're not cached or cache is expired
        const shouldFetchMetrics =
          !lastMetricsFetch ||
          new Date().getTime() - lastMetricsFetch.getTime() >
            METRICS_CACHE_DURATION;

        if (profile.manager_id && shouldFetchMetrics) {
          console.log("Fetching metrics...");
          const { data: metricsData, error: metricsError } = await supabase
            .from("custom_metrics")
            .select("*")
            .eq("manager_id", profile.manager_id)
            .order("created_at", { ascending: true });

          if (metricsError) {
            console.error("Error fetching metrics:", metricsError);
          } else {
            console.log("Metrics data:", metricsData);
            setMetrics(metricsData || []);
            setLastMetricsFetch(new Date());
          }

          // Only fetch responses if we have metrics
          if (metricsData && metricsData.length > 0) {
            console.log("Fetching today's responses...");
            const { data: responsesData, error: responsesError } =
              await supabase
                .from("metric_responses")
                .select("*")
                .eq("date", selectedDate)
                .eq("athlete_id", profile.id);

            if (responsesError) {
              console.error("Error fetching responses:", responsesError);
            } else {
              console.log("Responses data:", responsesData);
              // Convert responses array to record object
              const responsesRecord: Record<string, MetricResponse> = {};
              const localResponsesRecord: Record<
                string,
                { rating_value?: number; text_value?: string }
              > = {};

              responsesData?.forEach((response: MetricResponse) => {
                responsesRecord[response.metric_id] = response;
                localResponsesRecord[response.metric_id] = {
                  rating_value: response.rating_value || undefined,
                  text_value: response.text_value || undefined,
                };
              });

              setResponses(responsesRecord);
              setLocalResponses(localResponsesRecord);
            }
          }
        } else if (!profile.manager_id) {
          console.log(
            "No manager assigned - skipping form status and metrics fetch"
          );
          setFormStatus(null);
          setMetrics([]);
          setResponses({});
          setLocalResponses({});
        }

        console.log("All initial data fetched successfully");
        setLoading(false);
      } catch (error) {
        console.error("Error in fetchInitialData:", error);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [profile, selectedDate]);

  useEffect(() => {
    if (profile?.avatar_url) {
      setShowPhotoModal(false);
    }
  }, [profile?.avatar_url]);

  const handleUpdateLocalResponse = (
    metric: CustomMetric,
    value: string | number
  ) => {
    setLocalResponses((prev) => ({
      ...prev,
      [metric.id]: {
        rating_value: metric.type === "rating" ? (value as number) : undefined,
        text_value: metric.type === "text" ? (value as string) : undefined,
      },
    }));
    setHasLocalChanges(true);
  };

  const submitForm = async (sessionType: "AM" | "PM") => {
    try {
      setSubmitting(true);
      const session = sessionType === "AM" ? amSession : pmSession;
      const setSession = sessionType === "AM" ? setAmSession : setPmSession;

      // Get current date in local timezone
      const submissionDate = getLocalDate();

      // Validate the session data
      if (!session.rpe || !session.duration) {
        showNotification(
          "error",
          `Please fill in both RPE and Duration for the ${sessionType} session`
        );
        return;
      }

      // Delete existing session for this type if it exists
      const { error: deleteError } = await supabase
        .from("training_sessions")
        .delete()
        .eq("athlete_id", profile.id)
        .eq("date", submissionDate)
        .eq("session", sessionType);

      if (deleteError) {
        console.error("Error deleting existing session:", deleteError);
        throw deleteError;
      }

      // Insert new session with the correct date
      const { error: insertError } = await supabase
        .from("training_sessions")
        .insert({
          athlete_id: profile.id,
          date: submissionDate,
          session: sessionType,
          training_type: session.training_type,
          rpe: session.rpe,
          duration: session.duration,
          unit_load: calculateUnitLoad(session.rpe, session.duration),
        });

      if (insertError) {
        console.error("Error inserting session:", insertError);
        throw insertError;
      }

      // Update local state to mark session as submitted
      setSession((prev) => ({ ...prev, submitted: true }));

      // Check if both sessions are now submitted
      const otherSession = sessionType === "AM" ? pmSession : amSession;
      if (otherSession.submitted) {
        setHasSubmittedAll(true);
      }

      showNotification(
        "success",
        `${sessionType} session submitted successfully!`
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      showNotification("error", "Error submitting form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitMetrics = async () => {
    try {
      setSubmitting(true);
      const submissionDate = getLocalDate();

      // Validate metrics
      if (!validateMetrics()) {
        showNotification(
          "error",
          "Please fill in all metrics before submitting"
        );
        return;
      }

      // Prepare responses for insertion
      const responsesToInsert = metrics.map((metric) => ({
        athlete_id: profile.id,
        metric_id: metric.id,
        rating_value:
          metric.type === "rating"
            ? localResponses[metric.id]?.rating_value
            : null,
        text_value:
          metric.type === "text" ? localResponses[metric.id]?.text_value : null,
        date: submissionDate,
      }));

      // Insert all responses
      const { error: metricsError } = await supabase
        .from("metric_responses")
        .upsert(responsesToInsert, {
          onConflict: "athlete_id,metric_id,date",
        });

      if (metricsError) {
        console.error("Error submitting metrics:", metricsError);
        throw metricsError;
      }

      setMetricsSubmitted(true);
      setHasLocalChanges(false);
      showNotification("success", "Metrics submitted successfully!");
    } catch (error) {
      console.error("Error submitting metrics:", error);
      showNotification("error", "Error submitting metrics. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAll = async () => {
    try {
      // Submit metrics if they have changes
      if (!metricsSubmitted && hasLocalChanges) {
        await submitMetrics();
      }

      // Submit AM session if it has data
      if (amSession.rpe > 0 && !amSession.submitted) {
        await submitForm("AM");
      }

      // Submit PM session if it has data
      if (pmSession.rpe > 0 && !pmSession.submitted) {
        await submitForm("PM");
      }

      setHasSubmittedAll(true);
      showNotification("success", "All responses submitted successfully!");
    } catch (error) {
      console.error("Error submitting all responses:", error);
      showNotification(
        "error",
        "Error submitting responses. Please try again."
      );
    }
  };

  const validateMetrics = () => {
    return metrics.every((metric) => {
      const response = localResponses[metric.id];
      if (metric.type === "rating") {
        return (
          response?.rating_value !== undefined && response.rating_value > 0
        );
      } else {
        return (
          response?.text_value !== undefined &&
          response.text_value.trim() !== ""
        );
      }
    });
  };

  const handleLogout = async () => {
    try {
      // Clear all local storage items
      localStorage.clear();

      try {
        // First kill the session
        await supabase.auth.setSession({
          access_token: "",
          refresh_token: "",
        });
        // Then sign out locally
        await supabase.auth.signOut({
          scope: "local",
        });
      } catch (error) {
        // If signOut fails, just log it and continue
        console.warn("Sign out error:", error);
      }

      // Always navigate to login regardless of signOut success
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error during logout:", error);
      // If all else fails, force navigate to login
      navigate("/login", { replace: true });
    }
  };

  const calculateUnitLoad = (rpe: number, duration: number) => {
    return rpe * duration;
  };

  const handleProfileUpdate = (url: string) => {
    setProfile((prev) => {
      const updatedProfile = { ...prev, avatar_url: url };
      localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      return updatedProfile;
    });
  };

  const handlePhotoUpdate = (url: string) => {
    setProfile((prev) => {
      const updatedProfile = { ...prev, avatar_url: url };
      localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      return updatedProfile;
    });
    setShowPhotoModal(false);
  };

  const handleModalCancel = () => {
    setShowNoTrainingModal(false);
    setHighlightTraining(true);
    // Remove highlight after 5 seconds
    setTimeout(() => setHighlightTraining(false), 5000);
  };

  const renderTrainingSessionForm = (
    session: "AM" | "PM",
    data: TrainingSessionForm,
    setData: React.Dispatch<React.SetStateAction<TrainingSessionForm>>
  ) => (
    <div
      className={clsx(
        "p-6 rounded-xl bg-white shadow-sm",
        highlightTraining && !data.submitted && "ring-2 ring-blue-400"
      )}
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
        {session === "AM" ? "Morning Session (AM)" : "Afternoon Session (PM)"}
        {data.submitted && (
          <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
            Submitted
          </span>
        )}
      </h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Training Type
          </label>
          <select
            value={data.training_type}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                training_type: e.target.value as TrainingType,
              }))
            }
            disabled={data.submitted}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            {TRAINING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RPE (Rate of Perceived Exertion)
          </label>
          <RPEInput
            value={data.rpe}
            onChange={(value) => setData((prev) => ({ ...prev, rpe: value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={data.duration || ""}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                duration: parseInt(e.target.value) || 0,
              }))
            }
            disabled={data.submitted}
            min="0"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={() => submitForm(session)}
          disabled={submitting || data.submitted || !data.rpe || !data.duration}
          className={clsx(
            "w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200",
            data.submitted
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : !data.rpe || !data.duration
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {data.submitted
            ? "Session Submitted"
            : submitting
            ? "Submitting..."
            : `Submit ${session} Session`}
        </button>
      </div>
    </div>
  );

  // Early return for no manager, but keep the navigation bar
  if (!profile.manager_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:h-16">
              <div className="flex items-center justify-center sm:justify-start py-2 sm:py-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Athlete Dashboard
                </h1>
              </div>
              <div className="flex items-center justify-between sm:justify-end border-t border-white/10 sm:border-t-0 pt-2 sm:pt-0 mt-2 sm:mt-0">
                <div className="flex items-center gap-4">
                  <div className="transform transition-transform duration-300 hover:scale-105 ring-2 ring-white/20 rounded-full">
                    <ProfilePicture
                      profile={profile}
                      size="lg"
                      editable={true}
                      onUpdate={handleProfileUpdate}
                    />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-base sm:text-lg font-semibold text-white">
                      {profile.full_name}
                    </span>
                    <span className="text-sm text-blue-100">Athlete</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-4 sm:ml-8 inline-flex items-center text-blue-100 hover:text-white transition-all duration-200 hover:scale-105 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* No Manager Content */}
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Your Dashboard
            </h2>
            <p className="text-gray-600 mb-6">
              You currently don't have a manager assigned. To get started with
              tracking your training and metrics, you'll need to be connected
              with a manager.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Next Steps:
              </h3>
              <ul className="text-sm text-blue-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span>1.</span>
                  <span>Ask your manager to send you an invitation link</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>2.</span>
                  <span>Click the invitation link when you receive it</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>3.</span>
                  <span>
                    Once connected, you'll be able to track your daily metrics
                    and training sessions
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-sm text-gray-500">
              Designed & Developed by Francisco Martins ©{" "}
              {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (showPhotoModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div
          className={clsx(
            "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4",
            styles.animateFadeIn
          )}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-300 scale-95 hover:scale-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6 animate-bounce">
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Profile Picture Required
              </h2>
              <p className="text-base text-gray-600 mb-8">
                To help your manager identify you easily, please add a profile
                picture before proceeding.
              </p>
              <div className="flex justify-center mb-6 transform transition-transform duration-300 hover:scale-105">
                <ProfilePicture
                  profile={profile}
                  size="lg"
                  editable={true}
                  onUpdate={handlePhotoUpdate}
                />
              </div>
              <p className="text-sm text-gray-500 mb-8">
                Click the profile picture above to upload a photo
              </p>
              <div className="border-t border-gray-100 pt-6">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center text-sm text-gray-500 hover:text-gray-900 transition-all duration-200 hover:scale-105"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out instead
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const currentTime = new Date().toTimeString().split(" ")[0];

  // Update the form status check to always allow form submission when there's no manager
  const isFormOpen = formStatus === null || formStatus.is_open;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <nav className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:h-16">
            <div className="flex items-center justify-center sm:justify-start py-2 sm:py-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Athlete Dashboard
              </h1>
            </div>
            <div className="flex items-center justify-between sm:justify-end border-t border-white/10 sm:border-t-0 pt-2 sm:pt-0 mt-2 sm:mt-0">
              <div className="flex items-center gap-4">
                <div className="transform transition-transform duration-300 hover:scale-105 ring-2 ring-white/20 rounded-full">
                  <ProfilePicture
                    profile={profile}
                    size="lg"
                    editable={true}
                    onUpdate={handleProfileUpdate}
                  />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base sm:text-lg font-semibold text-white">
                    {profile.full_name}
                  </span>
                  <span className="text-sm text-blue-100">Athlete</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-4 sm:ml-8 inline-flex items-center text-blue-100 hover:text-white transition-all duration-200 hover:scale-105 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20"
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-grow">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden transform transition-all duration-300 hover:shadow-2xl">
          <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-8 mb-6 sm:mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Daily Check-in
                </h2>
              </div>
              <div
                className={clsx(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-md",
                  isFormOpen
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                    : "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                )}
              >
                {isFormOpen ? "Forms Open" : "Forms Closed"}
              </div>
            </div>

            {isFormOpen ? (
              hasSubmittedAll ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-100">
                    <svg
                      className="h-7 w-7 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-gray-900">
                    All Done!
                  </h3>
                  <p className="mt-2 text-gray-500">
                    You've completed all your check-ins for today.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  {!metricsSubmitted && (
                    <div className="mb-8">
                      <div className="flex items-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Daily Wellness Check-in
                        </h3>
                      </div>

                      {/* Single Athlete Header */}
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                          <p className="text-sm text-gray-500">
                            {formatDateForDisplay(selectedDate)}
                          </p>
                        </div>

                        {/* Metrics Grid */}
                        <div className="space-y-4">
                          {metrics.map((metric) => {
                            const localResponse =
                              localResponses[metric.id] || {};
                            return (
                              <div
                                key={metric.id}
                                className="bg-white/50 rounded-lg p-4 hover:bg-blue-50/50 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                  <div className="flex-grow">
                                    <div className="text-base font-medium text-gray-900">
                                      {metric.title}
                                    </div>
                                    {metric.description && (
                                      <p className="text-sm text-gray-500 mt-1">
                                        {metric.description}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      1=awful 2=poor 3=OK 4=good 5=excellent
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {metric.type === "rating" ? (
                                      <RatingInput
                                        value={localResponse.rating_value || 0}
                                        onChange={(value) =>
                                          handleUpdateLocalResponse(
                                            metric,
                                            value
                                          )
                                        }
                                      />
                                    ) : (
                                      <div className="w-full sm:w-64">
                                        <textarea
                                          value={localResponse.text_value || ""}
                                          onChange={(e) =>
                                            handleUpdateLocalResponse(
                                              metric,
                                              e.target.value
                                            )
                                          }
                                          rows={3}
                                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border-gray-200 rounded-lg resize-none"
                                          placeholder="Enter your response..."
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Submit button moved here */}
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={submitMetrics}
                            disabled={submitting || !validateMetrics()}
                            className={clsx(
                              "px-6 py-3 rounded-xl font-medium transition-all duration-200",
                              "flex items-center gap-2",
                              submitting || !validateMetrics()
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow transform hover:scale-105"
                            )}
                          >
                            {submitting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Submit Daily Check-in</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-6 sm:pt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Training Sessions
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:gap-8">
                      <div className="bg-gray-50 p-4 sm:p-6 rounded-xl space-y-4 sm:space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="text-base font-medium text-gray-900">
                            Morning Session (AM)
                          </h4>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Did you train this morning?
                          </label>
                          <select
                            value={amSession.rpe > 0 ? "yes" : "no"}
                            onChange={(e) => {
                              if (e.target.value === "no") {
                                setAmSession({
                                  ...amSession,
                                  rpe: 0,
                                  duration: 0,
                                });
                              } else {
                                setAmSession({
                                  ...amSession,
                                  rpe: 1,
                                  duration: 30,
                                });
                              }
                            }}
                            className="block w-full rounded-lg border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                            disabled={amSession.submitted}
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </div>
                        {amSession.rpe > 0 && !amSession.submitted && (
                          <div className="space-y-4 sm:space-y-6 pt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Training Type
                              </label>
                              <select
                                value={amSession.training_type}
                                onChange={(e) =>
                                  setAmSession({
                                    ...amSession,
                                    training_type: e.target
                                      .value as TrainingType,
                                  })
                                }
                                className="block w-full rounded-lg border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                                disabled={amSession.submitted}
                              >
                                {TRAINING_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                RPE (1-10)
                              </label>
                              <RPEInput
                                value={amSession.rpe}
                                onChange={(value) =>
                                  !amSession.submitted &&
                                  setAmSession({ ...amSession, rpe: value })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Duration (minutes)
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                value={
                                  amSession.duration === 0
                                    ? ""
                                    : amSession.duration
                                }
                                onChange={(e) => {
                                  if (amSession.submitted) return;
                                  const value = e.target.value;
                                  if (value === "") {
                                    setAmSession({ ...amSession, duration: 0 });
                                  } else {
                                    const num = parseInt(value);
                                    if (!isNaN(num) && num >= 0) {
                                      setAmSession({
                                        ...amSession,
                                        duration: num,
                                      });
                                    }
                                  }
                                }}
                                className="block w-full rounded-lg border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                                disabled={amSession.submitted}
                              />
                            </div>
                            <div className="pt-2">
                              <div className="text-sm font-medium text-blue-600">
                                Unit Load:{" "}
                                {calculateUnitLoad(
                                  amSession.rpe,
                                  amSession.duration
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 sm:p-6 rounded-xl space-y-4 sm:space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="text-base font-medium text-gray-900">
                            Afternoon Session (PM)
                          </h4>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Did you train this afternoon?
                          </label>
                          <select
                            value={pmSession.rpe > 0 ? "yes" : "no"}
                            onChange={(e) => {
                              if (e.target.value === "no") {
                                setPmSession({
                                  ...pmSession,
                                  rpe: 0,
                                  duration: 0,
                                });
                              } else {
                                setPmSession({
                                  ...pmSession,
                                  rpe: 1,
                                  duration: 30,
                                });
                              }
                            }}
                            className="block w-full rounded-lg border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                            disabled={pmSession.submitted}
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </div>
                        {pmSession.rpe > 0 && !pmSession.submitted && (
                          <div className="space-y-4 sm:space-y-6 pt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Training Type
                              </label>
                              <select
                                value={pmSession.training_type}
                                onChange={(e) =>
                                  setPmSession({
                                    ...pmSession,
                                    training_type: e.target
                                      .value as TrainingType,
                                  })
                                }
                                className="block w-full rounded-lg border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                                disabled={pmSession.submitted}
                              >
                                {TRAINING_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                RPE (1-10)
                              </label>
                              <RPEInput
                                value={pmSession.rpe}
                                onChange={(value) =>
                                  !pmSession.submitted &&
                                  setPmSession({ ...pmSession, rpe: value })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Duration (minutes)
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                value={
                                  pmSession.duration === 0
                                    ? ""
                                    : pmSession.duration
                                }
                                onChange={(e) => {
                                  if (pmSession.submitted) return;
                                  const value = e.target.value;
                                  if (value === "") {
                                    setPmSession({ ...pmSession, duration: 0 });
                                  } else {
                                    const num = parseInt(value);
                                    if (!isNaN(num) && num >= 0) {
                                      setPmSession({
                                        ...pmSession,
                                        duration: num,
                                      });
                                    }
                                  }
                                }}
                                className="block w-full rounded-lg border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                                disabled={pmSession.submitted}
                              />
                            </div>
                            <div className="pt-2">
                              <div className="text-sm font-medium text-blue-600">
                                Unit Load:{" "}
                                {calculateUnitLoad(
                                  pmSession.rpe,
                                  pmSession.duration
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="mt-2 flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <svg
                              className="h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <p>
                            If you haven't trained yet but plan to train later
                            today, please leave this as "No" and come back to
                            submit after your training is completed.
                          </p>
                        </div>
                      </div>

                      {(amSession.rpe > 0 || pmSession.rpe > 0) && (
                        <div className="bg-blue-50 rounded-xl p-6">
                          <div className="flex flex-col gap-6">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <svg
                                  className="h-6 w-6 text-blue-500"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-base font-medium text-blue-900">
                                  Before submitting
                                </h4>
                                <ul className="mt-2 text-sm text-blue-800 space-y-1">
                                  <li>• Fill out all daily metric ratings</li>
                                  <li>
                                    • Indicate if you had any training sessions
                                    (AM/PM)
                                  </li>
                                  <li>
                                    • For each training session, provide the
                                    type, RPE, and duration
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={handleSubmitAll}
                                disabled={
                                  submitting ||
                                  !metrics.every((metric) => {
                                    const response = localResponses[metric.id];
                                    return metric.type === "rating"
                                      ? response?.rating_value !== undefined &&
                                          response.rating_value > 0
                                      : response?.text_value !== undefined &&
                                          response.text_value.trim() !== "";
                                  })
                                }
                                className={clsx(
                                  "w-full sm:w-auto px-6 py-3 rounded-xl transition-all duration-200 font-medium",
                                  "flex items-center justify-center gap-2",
                                  submitting
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow transform hover:scale-105"
                                )}
                              >
                                {submitting ? (
                                  <>
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span>Submitting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-5 h-5" />
                                    <span>Submit All Responses</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-gray-100">
                  <Calendar className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">
                  Forms Closed
                </h3>
                <p className="mt-2 text-gray-500">
                  Check back later when your manager opens the forms.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-gray-500">
            Designed & Developed by Francisco Martins ©{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      <NoTrainingModal
        isOpen={showNoTrainingModal}
        onConfirm={() => {}}
        onCancel={handleModalCancel}
      />

      {notification && (
        <div
          className={clsx(
            "fixed bottom-4 right-4 max-w-sm w-full bg-white rounded-xl shadow-lg pointer-events-auto overflow-hidden transition-all duration-500 transform",
            notification.show
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0",
            "border-l-4",
            notification.type === "success"
              ? "border-green-500"
              : "border-red-500"
          )}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === "success" ? (
                  <Check className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p
                  className={clsx(
                    "text-sm font-medium",
                    notification.type === "success"
                      ? "text-green-900"
                      : "text-red-900"
                  )}
                >
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={() => setNotification(null)}
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
