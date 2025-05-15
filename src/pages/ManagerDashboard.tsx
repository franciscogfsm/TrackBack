import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type {
  Profile,
  CustomMetric,
  MetricResponseType,
  DailyFormStatus,
  TrainingType,
  TrainingSession,
} from "../lib/database.types";
import { useNavigate, Link } from "react-router-dom";
import {
  LogOut,
  Plus,
  User,
  Calendar,
  Settings,
  X,
  Check,
  Trash2,
  BarChart2,
  Calendar as CalendarIcon,
  Users,
  UserPlus,
  Copy,
  RefreshCw,
  Brain,
  Sparkles,
  HelpCircle,
  Info,
  Moon,
  Sun,
  Monitor,
  Mail,
  MapPin,
  Shield,
  FileText,
  Bell,
  Trophy,
  Menu,
  Dumbbell,
} from "lucide-react";
import clsx from "clsx";
import ProfilePicture from "../components/ProfilePicture";
import InviteAthleteModal from "../components/InviteAthleteModal";
import type { Tables } from "../lib/database.types";
import AthletesInsights from "../components/AthletesInsights";
import type { PerformanceData } from "../services/aiInsights";
import { useTheme } from "../components/ThemeProvider";
import PersonalRecordsTable from "../components/PersonalRecordsTable";
import PersonalRecordsChart from "../components/PersonalRecordsChart";
import TeamPersonalBests from "../components/TeamPersonalBests";
import TrainingProgramManager from "../components/TrainingProgramManager";
import WeightReport from "../components/WeightReport";

type ManagerInvitation = Tables<"manager_invitations">;

interface Metric {
  id: number;
  title: string;
  description: string;
  type: string;
  manager_id: string;
  created_at: string;
}

interface Props {
  profile: Profile;
}

interface MetricResponseWithDetails {
  id: number;
  created_at: string;
  athlete_id: string;
  metric_id: number;
  rating_value?: number;
  text_value?: string;
  athlete: Profile;
  metric: {
    title: string;
    type: "rating" | "text";
    description?: string;
  };
}

interface FormStatus extends Omit<DailyFormStatus, "close_time"> {
  close_time: string;
}

interface MetricResponse {
  id: number;
  athlete_id: string;
  metric_id: number;
  value: string | number;
  date: string;
}

interface ManagerInvitationWithProfile extends Tables<"manager_invitations"> {
  manager?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Add theme types
type Theme = "light" | "dark" | "system";

const RatingInput = ({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => !readOnly && onChange?.(rating)}
          disabled={readOnly}
          className={clsx(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 text-base font-medium",
            value === rating
              ? "bg-blue-500 text-white shadow-md transform scale-105"
              : readOnly
              ? "bg-gray-100 text-gray-400 cursor-default"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 active:scale-95"
          )}
        >
          {rating}
        </button>
      ))}
    </div>
  );
};

const MetricResponseCard = ({
  response,
}: {
  response: MetricResponseWithDetails;
}) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {response.athlete.full_name}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm text-blue-600 font-medium">
            {response.metric.title}
          </div>
          {response.metric.description && (
            <div className="text-xs text-gray-500 mt-1">
              {response.metric.description}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {response.metric.type === "rating" ? (
          <div className="flex items-center">
            <RatingInput value={response.rating_value || 0} readOnly />
          </div>
        ) : (
          <div className="max-w-md">
            <p className="text-gray-600 text-sm">{response.text_value}</p>
          </div>
        )}
      </td>
    </tr>
  );
};

const MetricForm = ({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    title: string;
    description: string;
    type: "rating" | "text";
  }) => void;
  onCancel: () => void;
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"rating" | "text">("rating");
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit({ title, description, type });
    setTitle("");
    setDescription("");
    setType("rating");
  };

  return (
    <div
      className={clsx(
        "rounded-xl",
        theme === "dark"
          ? "bg-slate-900/50 ring-1 ring-slate-700/50"
          : "bg-white border border-gray-200"
      )}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-1.5">
          <label
            className={clsx(
              "block text-sm font-medium",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Title
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter metric title"
            className={clsx(
              "w-full px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
              theme === "dark"
                ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
            )}
          />
        </div>

        <div className="space-y-1.5">
          <label
            className={clsx(
              "block text-sm font-medium",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Enter metric description (optional)"
            className={clsx(
              "w-full px-4 py-2.5 rounded-lg text-sm transition-all duration-200 resize-none",
              theme === "dark"
                ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
            )}
          />
          <p
            className={clsx(
              "text-xs",
              theme === "dark" ? "text-slate-400" : "text-gray-500"
            )}
          >
            Add details to help athletes understand what to report
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            className={clsx(
              "block text-sm font-medium",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Type
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "rating" | "text")}
            className={clsx(
              "w-full px-4 py-2.5 rounded-lg text-sm transition-all duration-200 appearance-none bg-no-repeat bg-right",
              theme === "dark"
                ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50"
                : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50",
              "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNyA3TDEwIDEwTDEzIDciIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')]"
            )}
            style={{ backgroundPosition: "right 1rem center" }}
          >
            <option value="rating">Rating (1-5)</option>
            <option value="text">Text</option>
          </select>
          <p
            className={clsx(
              "text-xs",
              theme === "dark" ? "text-slate-400" : "text-gray-500"
            )}
          >
            {type === "rating"
              ? "1-5 scale for quick numerical feedback"
              : "Free text response for detailed feedback"}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              theme === "dark"
                ? "text-slate-300 hover:text-white hover:bg-slate-800"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              theme === "dark"
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 ring-1 ring-blue-500/30"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            Create Metric
          </button>
        </div>
      </form>
    </div>
  );
};

// Add grouping function before the component declaration
function groupResponsesByAthlete(responses: MetricResponseWithDetails[]) {
  const groupedData = new Map<
    string,
    {
      athleteId: string;
      athleteName: string;
      athleteProfile: Profile;
      responses: {
        id: string;
        metricTitle: string;
        metricType: "rating" | "text";
        value: number | string;
      }[];
    }
  >();

  responses.forEach((response) => {
    const athleteId = response.athlete_id;
    const athleteName = response.athlete.full_name;
    const athleteProfile = response.athlete;

    if (!groupedData.has(athleteId)) {
      groupedData.set(athleteId, {
        athleteId,
        athleteName,
        athleteProfile,
        responses: [],
      });
    }

    const group = groupedData.get(athleteId);
    if (group) {
      group.responses.push({
        id: response.id.toString(),
        metricTitle: response.metric.title,
        metricType: response.metric.type,
        value:
          response.metric.type === "rating"
            ? response.rating_value || 0
            : response.text_value || "",
      });
    }
  });

  return Array.from(groupedData.values());
}

const GroupedMetricResponses = ({
  responses,
}: {
  responses: MetricResponseWithDetails[];
}) => {
  const groupedByAthlete = groupResponsesByAthlete(responses);
  const [expandedAthletes, setExpandedAthletes] = useState<Set<string>>(
    new Set()
  );

  const toggleAthlete = (athleteId: string) => {
    setExpandedAthletes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(athleteId)) {
        newSet.delete(athleteId);
      } else {
        newSet.add(athleteId);
      }
      return newSet;
    });
  };

  return (
    <div className="divide-y divide-gray-200">
      {groupedByAthlete.map((group) => {
        const isExpanded = expandedAthletes.has(group.athleteId);
        return (
          <div key={group.athleteId} className="bg-white">
            <button
              onClick={() => toggleAthlete(group.athleteId)}
              className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ProfilePicture profile={group.athleteProfile} size="md" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {group.athleteName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {group.responses.length} responses
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`transform transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <svg
                      className="h-5 w-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
            {isExpanded && (
              <div className="px-6 py-4 bg-white">
                <div className="space-y-4">
                  {group.responses.map((response) => (
                    <div
                      key={response.id}
                      className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {response.metricTitle}
                        </h4>
                        <div className="mt-1">
                          {response.metricType === "rating" ? (
                            <RatingInput
                              value={Number(response.value)}
                              readOnly
                            />
                          ) : (
                            <p className="text-sm text-gray-600">
                              {response.value}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
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

function transformMetricResponses(
  responses: MetricResponseWithDetails[],
  athleteId: string
): PerformanceData[] {
  // Group responses by date
  const responsesByDate = responses
    .filter((response) => response.athlete_id === athleteId)
    .reduce<{ [key: string]: PerformanceData }>((acc, response) => {
      const date = new Date(response.created_at).toISOString().split("T")[0];

      if (!acc[date]) {
        acc[date] = {
          date,
          metrics: {},
          notes: "",
        };
      }

      if (
        response.metric.type === "rating" &&
        response.rating_value !== null &&
        response.rating_value !== undefined
      ) {
        acc[date].metrics[response.metric.title] = response.rating_value;
      }

      if (response.metric.type === "text" && response.text_value) {
        const currentNotes = acc[date].notes;
        acc[date].notes = currentNotes
          ? `${currentNotes}\n${response.metric.title}: ${response.text_value}`
          : `${response.metric.title}: ${response.text_value}`;
      }

      return acc;
    }, {});

  // Convert to array and sort by date
  return Object.values(responsesByDate).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export default function ManagerDashboard({ profile: initialProfile }: Props) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricResponses, setMetricResponses] = useState<
    MetricResponseWithDetails[]
  >([]);
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [availableAthletes, setAvailableAthletes] = useState<Profile[]>([]);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [newAthleteId, setNewAthleteId] = useState("");
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null);
  const [deletingMetricId, setDeletingMetricId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDate());
  const [formStatus, setFormStatus] = useState<DailyFormStatus | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [selectedAthleteForInsights, setSelectedAthleteForInsights] =
    useState<Profile | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [globalReminderTime, setGlobalReminderTime] = useState("20:00");
  const [isUpdatingGlobalReminder, setIsUpdatingGlobalReminder] =
    useState(false);
  const [invitations, setInvitations] = useState<ManagerInvitation[]>([]);
  const [hiddenInvitations, setHiddenInvitations] = useState<Set<string>>(
    new Set()
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showReminderSuccess, setShowReminderSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCopyNotification, setShowCopyNotification] = useState<
    string | null
  >(null);
  // State for PR modal and form (for manager add record)
  const [showPRModal, setShowPRModal] = useState(false);
  const [prForm, setPRForm] = useState({
    exercise: "",
    weight: 0,
    record_date: "",
    video_url: "",
    notes: "",
  });
  const [editingPRId, setEditingPRId] = useState<string | null>(null);
  // Add a refreshKey to force refresh after adding a record
  const [prRefreshKey, setPRRefreshKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Add state for tab selection
  const [athleteTab, setAthleteTab] = useState<"athletes" | "invite">(
    "athletes"
  );
  const [insightsMetricResponses, setInsightsMetricResponses] = useState<
    MetricResponseWithDetails[]
  >([]);
  // 1. Add new state for performanceReportAthlete
  const [performanceReportAthlete, setPerformanceReportAthlete] =
    useState<string>("");

  useEffect(() => {
    const root = window.document.documentElement;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    const activeTheme = theme === "system" ? systemTheme : theme;

    root.classList.remove("light", "dark");
    root.classList.add(activeTheme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchInitialData();
    fetchInvitations();
  }, [profile.id, refreshKey]);

  // Add new useEffect for time-based form status updates
  useEffect(() => {
    if (!formStatus || !profile?.id) return;

    const checkAndUpdateFormStatus = async () => {
      // Don't auto-open if manually closed
      if (formStatus.manually_closed) return;

      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      // Convert times to comparable format (minutes since midnight)
      const currentMinutes =
        parseInt(currentTime.split(":")[0]) * 60 +
        parseInt(currentTime.split(":")[1]);
      const openMinutes =
        parseInt(formatTimeForInput(formStatus.open_time).split(":")[0]) * 60 +
        parseInt(formatTimeForInput(formStatus.open_time).split(":")[1]);
      const closeMinutes =
        parseInt(formatTimeForInput(formStatus.close_time).split(":")[0]) * 60 +
        parseInt(formatTimeForInput(formStatus.close_time).split(":")[1]);

      // Determine if forms should be open based on time
      const shouldBeOpen =
        currentMinutes >= openMinutes && currentMinutes < closeMinutes;

      // Update form status if it doesn't match what it should be
      if (shouldBeOpen !== formStatus.is_open) {
        handleUpdateFormStatus(
          shouldBeOpen,
          formStatus.open_time || "00:00",
          formStatus.close_time || "23:59"
        );
      }
    };

    // Check immediately
    checkAndUpdateFormStatus();

    // Set up interval to check every minute
    const interval = setInterval(checkAndUpdateFormStatus, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [formStatus, profile]);

  useEffect(() => {
    if (profile?.id) {
      fetchMetricResponses();
    }
  }, [selectedDate, selectedAthlete]);

  const fetchMetricResponses = async () => {
    try {
      // First get the manager's athletes
      const { data: athletesData, error: athletesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("manager_id", profile.id)
        .eq("role", "athlete");

      if (athletesError) {
        console.error("Error fetching athletes:", athletesError);
        return;
      }

      if (!athletesData || athletesData.length === 0) {
        setMetricResponses([]);
        return;
      }

      // Get the athlete IDs
      const athleteIds = athletesData.map((athlete) => athlete.id);

      // Then fetch responses only for those athletes
      const { data: responses, error } = await supabase
        .from("metric_responses")
        .select("*")
        .eq("date", selectedDate)
        .in("athlete_id", athleteIds);

      if (error) {
        console.error("Error fetching responses:", error);
        return;
      }

      if (!responses || responses.length === 0) {
        setMetricResponses([]);
        return;
      }

      // Get unique metric IDs
      const metricIds = [...new Set(responses.map((r) => r.metric_id))];

      // Fetch athletes and metrics in parallel
      const [athletesResult, metricsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("id", athleteIds),
        supabase
          .from("custom_metrics")
          .select("id, title, type, description")
          .in("id", metricIds),
      ]);

      if (athletesResult.error) {
        console.error("Error fetching athletes:", athletesResult.error);
        return;
      }

      if (metricsResult.error) {
        console.error("Error fetching metrics:", metricsResult.error);
        return;
      }

      // Create lookup maps
      const athletesMap = new Map(athletesResult.data?.map((a) => [a.id, a]));
      const metricsMap = new Map(metricsResult.data?.map((m) => [m.id, m]));

      // Combine the data
      const formattedResponses = responses.map((response) => ({
        id: response.id,
        created_at: response.created_at,
        athlete_id: response.athlete_id,
        metric_id: response.metric_id,
        rating_value: response.rating_value,
        text_value: response.text_value,
        athlete: athletesMap.get(response.athlete_id) || {
          id: response.athlete_id,
          full_name: "Unknown Athlete",
          email: "",
          role: "athlete",
        },
        metric: {
          title: metricsMap.get(response.metric_id)?.title || "Unknown Metric",
          type: metricsMap.get(response.metric_id)?.type || "rating",
          description: metricsMap.get(response.metric_id)?.description || "",
        },
      }));

      setMetricResponses(formattedResponses);
    } catch (error) {
      console.error("Unexpected error in fetchMetricResponses:", error);
      setMetricResponses([]);
    }
  };

  const verifyAthleteAddition = async (athleteId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", athleteId)
      .single();

    if (error) {
      console.error("Error verifying athlete:", error);
      return;
    }

    return data;
  };

  const handleAddAthlete = async () => {
    if (!profile?.id || !newAthleteId) return;

    try {
      // First verify the athlete exists and is available
      const { data: athleteToAdd, error: verifyError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", newAthleteId)
        .eq("role", "athlete")
        .is("manager_id", null)
        .maybeSingle();

      if (verifyError) {
        console.error("Error verifying athlete:", verifyError);
        return;
      }

      if (!athleteToAdd) {
        console.error("Athlete not found or already has a manager");
        return;
      }

      // Update the athlete's manager_id
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ manager_id: profile.id })
        .eq("id", newAthleteId)
        .eq("role", "athlete");

      if (updateError) {
        console.error("Error adding athlete:", updateError);
        return;
      }

      // Optimistically update the UI
      setAthletes((prev) =>
        [...prev, athleteToAdd].sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        )
      );
      setAvailableAthletes((prev) =>
        prev.filter((athlete) => athlete.id !== athleteToAdd.id)
      );

      // Reset form and close modal
      setNewAthleteId("");
      setShowAddAthlete(false);
      setSelectedAthlete("all");
    } catch (error) {
      console.error("Error in handleAddAthlete:", error);
    }
  };

  const handleCreateMetric = async (data: {
    title: string;
    description: string;
    type: "rating" | "text";
  }) => {
    if (!profile?.id) return;

    try {
      // Check if manager has reached the limit
      if (metrics.length >= 10) {
        setError("You have reached the maximum limit of 10 metrics");
        return;
      }

      // Create the new metric
      const { error: createError } = await supabase
        .from("custom_metrics")
        .insert({
          manager_id: profile.id,
          title: data.title,
          description: data.description || null,
          type: data.type,
          is_active: true,
        });

      if (createError) {
        console.error("Error creating metric:", createError);
        setError("Failed to create metric. Please try again.");
        return;
      }

      // Fetch updated metrics list
      const { data: updatedMetrics, error: fetchError } = await supabase
        .from("custom_metrics")
        .select("*")
        .eq("manager_id", profile.id)
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("Error fetching updated metrics:", fetchError);
        return;
      }

      // Update state with new metrics
      setMetrics(updatedMetrics || []);

      // Show success message
      setSuccessMessage("Metric created successfully!");
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error in handleCreateMetric:", error);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const formatTimeForInput = (timeString: string | null | undefined) => {
    if (!timeString) return "00:00";
    // Remove timezone information and seconds if present
    return timeString.split("+")[0].split(".")[0].substring(0, 5);
  };

  const formatTimeForDatabase = (timeString: string) => {
    // Ensure we have a valid time format
    const [hours, minutes] = timeString.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00+00`;
  };

  const handleUpdateFormStatus = async (
    isOpen: boolean,
    openTime: string,
    closeTime: string
  ) => {
    if (!profile?.id) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const formattedOpenTime = formatTimeForDatabase(openTime);
      const formattedCloseTime = formatTimeForDatabase(closeTime);

      const updateData = {
        is_open: isOpen,
        open_time: formattedOpenTime,
        close_time: formattedCloseTime,
        manager_id: profile.id,
        date: today, // Add the date field
      };

      // First check if any record exists for this manager
      const { data: existingStatus } = await supabase
        .from("daily_form_status")
        .select()
        .eq("manager_id", profile.id)
        .maybeSingle();

      if (existingStatus) {
        // Update existing record
        const { error } = await supabase
          .from("daily_form_status")
          .update(updateData)
          .eq("manager_id", profile.id);

        if (error) {
          console.error("Error updating form status:", error);
          throw error;
        }
      } else {
        // Create first record for this manager
        const { error } = await supabase.from("daily_form_status").insert({
          ...updateData,
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error("Error creating form status:", error);
          throw error;
        }
      }

      // Update local state
      setFormStatus((prev) => (prev ? { ...prev, ...updateData } : null));
    } catch (error) {
      console.error("Error updating form status:", error);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.clear();
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      navigate("/login");
    }
  };

  const handleRemoveAthlete = async (
    athleteId: string,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!profile?.id) return;

    try {
      // Find the athlete before removing
      const athleteToRemove = athletes.find(
        (athlete) => athlete.id === athleteId
      );
      if (!athleteToRemove) return;

      // Optimistically update UI first
      setAthletes((prev) => prev.filter((athlete) => athlete.id !== athleteId));
      setAvailableAthletes((prev) =>
        [...prev, athleteToRemove].sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        )
      );

      // If the removed athlete was the selected one, reset to "all"
      if (selectedAthlete === athleteId) {
        setSelectedAthlete("all");
      }

      // Then perform the actual update
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ manager_id: null })
        .eq("id", athleteId)
        .eq("role", "athlete");

      if (updateError) {
        console.error("Error removing athlete:", updateError);
        // Revert the UI changes if there was an error
        fetchInitialData();
        return;
      }
    } catch (error) {
      console.error("Error in handleRemoveAthlete:", error);
      // Revert the UI changes if there was an error
      fetchInitialData();
    }
  };

  const fetchMetrics = async () => {
    if (!profile?.id) return;

    try {
      const { data: metricsData, error: metricsError } = await supabase
        .from("custom_metrics")
        .select("*")
        .eq("manager_id", profile.id)
        .order("created_at", { ascending: true });

      if (metricsError) {
        console.error("Error fetching metrics:", metricsError);
        return;
      }

      setMetrics(metricsData || []);
    } catch (error) {
      console.error("Error in fetchMetrics:", error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data: invitationsData, error } = await supabase
        .from("manager_invitations")
        .select(
          `
          id,
          created_at,
          invitation_code,
          manager_id,
          status,
          expires_at,
          email
        `
        )
        .eq("manager_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching invitations:", error);
        return;
      }

      // Since we can't directly join with auth.users, we'll use the current profile data
      const transformedInvitations = (invitationsData || []).map(
        (invitation: any) => ({
          ...invitation,
          manager: {
            id: profile.id,
            email: profile.email,
          },
        })
      );

      setInvitations(transformedInvitations);
    } catch (error) {
      console.error("Unexpected error in fetchInvitations:", error);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch athletes
      const { data: athletesData, error: athletesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("manager_id", profile.id)
        .eq("role", "athlete");

      if (athletesError) {
        console.error("Error fetching athletes:", athletesError);
        return;
      }

      setAthletes(athletesData || []);

      // Fetch form status and reminder settings for this manager
      const { data: formStatusData, error: formStatusError } = await supabase
        .from("daily_form_status")
        .select("*")
        .eq("manager_id", profile.id)
        .single();

      if (formStatusError && formStatusError.code !== "PGRST116") {
        console.error("Error fetching form status:", formStatusError);
      } else {
        setFormStatus(formStatusData || null);
        // Set the global reminder time from form status
        if (formStatusData?.global_reminder_time) {
          setGlobalReminderTime(formStatusData.global_reminder_time);
        }
      }

      // Fetch metrics and responses
      await fetchMetrics();
      await fetchMetricResponses();
    } catch (error) {
      console.error("Error in fetchInitialData:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update the delete metric flow to use a confirmation modal
  const confirmDeleteMetric = (metric: Metric) => {
    setMetricToDelete(metric);
    setShowDeleteConfirmation(true);
  };

  const cancelDeleteMetric = () => {
    setMetricToDelete(null);
    setShowDeleteConfirmation(false);
  };

  const closeMetricsModal = () => {
    setShowMetricsModal(false);
    setShowDeleteConfirmation(false);
    setMetricToDelete(null);
  };

  const handleDeleteMetric = async () => {
    if (!profile?.id || !metricToDelete) {
      console.error("Cannot delete: missing profile or metric", {
        profileId: profile?.id,
        metricToDelete,
      });
      return;
    }

    try {
      console.log("Starting metric deletion process for:", metricToDelete.id);
      setDeletingMetricId(metricToDelete.id);

      // First, delete all responses associated with the metric
      const { data: deletedResponses, error: deleteResponsesError } =
        await supabase
          .from("metric_responses")
          .delete()
          .eq("metric_id", metricToDelete.id);

      if (deleteResponsesError) {
        console.error(
          "Error deleting metric responses from database:",
          deleteResponsesError
        );
        alert(
          "Failed to delete metric responses: " + deleteResponsesError.message
        );
        return;
      }

      console.log("Metric responses deleted successfully");

      // Then, delete the metric
      const { data, error: deleteError } = await supabase
        .from("custom_metrics")
        .delete()
        .eq("id", metricToDelete.id)
        .eq("manager_id", profile.id);

      if (deleteError) {
        console.error("Error deleting metric from database:", deleteError);
        alert("Failed to delete metric: " + deleteError.message);
        return;
      }

      console.log("Metric deleted successfully, closing confirmation dialog");

      // Update the metrics state by removing the deleted metric
      const oldMetricsCount = metrics.length;
      setMetrics((prev) => {
        const newMetrics = prev.filter(
          (metric) => metric.id !== metricToDelete.id
        );
        console.log(
          `Filtered metrics from ${oldMetricsCount} to ${newMetrics.length}`
        );
        return newMetrics;
      });

      // Close the confirmation modal
      setShowDeleteConfirmation(false);
      setMetricToDelete(null);
    } catch (error) {
      console.error("Unexpected error in handleDeleteMetric:", error);
      alert("An unexpected error occurred while deleting the metric");
    } finally {
      setDeletingMetricId(null);
    }
  };

  // Add profile update handler
  const handleProfileUpdate = (url: string) => {
    // Update local state
    setProfile((prev) => {
      const updatedProfile = { ...prev, avatar_url: url };
      // Update localStorage
      localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      return updatedProfile;
    });
  };

  const handleCopyLink = (invitationCode: string) => {
    const inviteUrl = `${window.location.origin}/join?code=${invitationCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setShowCopyNotification(invitationCode);
    setTimeout(() => setShowCopyNotification(null), 2000);
  };

  // Add useEffect to handle hiding accepted invitations
  useEffect(() => {
    const hideAcceptedInvitations = () => {
      invitations.forEach((invitation) => {
        if (invitation.status === "accepted") {
          setTimeout(() => {
            setHiddenInvitations((prev) => new Set([...prev, invitation.id]));
          }, 3000); // Hide after 3 seconds
        }
      });
    };

    hideAcceptedInvitations();
  }, [invitations]);

  // Filter out hidden invitations from the display
  const visibleInvitations = invitations.filter(
    (invitation) => !hiddenInvitations.has(invitation.id)
  );

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      // Optimistically update UI
      setInvitations((currentInvitations) =>
        currentInvitations.filter((inv) => inv.id !== invitationId)
      );

      // Make API call
      const { error: deleteError } = await supabase
        .from("manager_invitations")
        .delete()
        .eq("id", invitationId);

      if (deleteError) {
        // If error occurs, revert the optimistic update
        setError("Failed to delete invitation. Please try again.");
        fetchInvitations(); // Refresh the invitations list
      }
    } catch (error) {
      console.error("Error deleting invitation:", error);
      setError("Failed to delete invitation. Please try again.");
      fetchInvitations(); // Refresh the invitations list
    }
  };

  const handleUpdateGlobalReminderTime = async (newTime: string) => {
    try {
      // Update only the global_reminder_time field for this manager
      const { error } = await supabase
        .from("daily_form_status")
        .update({ global_reminder_time: newTime })
        .eq("manager_id", profile.id);

      if (error) throw error;

      // Update local state
      setFormStatus((prev) =>
        prev ? { ...prev, global_reminder_time: newTime } : null
      );
      setGlobalReminderTime(newTime);

      // Trigger the send-reminders function to check if emails need to be sent
      const { error: reminderError } = await supabase.functions.invoke(
        "send-reminders",
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );
      if (reminderError) {
        console.error("Error triggering reminders:", reminderError);
      }

      // Show success message
      setSuccessMessage(`Reminder time updated to ${newTime}`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error updating global reminder time:", error);
      setError("Failed to update global reminder time");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleToggleReminders = async (enabled: boolean) => {
    try {
      // Update only the enable_reminders field for this manager
      const { error } = await supabase
        .from("daily_form_status")
        .update({ enable_reminders: enabled })
        .eq("manager_id", profile.id);

      if (error) throw error;

      // Update local state
      setFormStatus((prev) =>
        prev ? { ...prev, enable_reminders: enabled } : null
      );
      setSuccessMessage(enabled ? "Reminders enabled" : "Reminders disabled");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error updating reminder status:", error);
      setError("Failed to update reminder status");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Fetch all metric responses for an athlete (for AI insights)
  const fetchAllMetricResponsesForAthlete = async (athleteId: string) => {
    try {
      // Get all responses for this athlete
      const { data: responses, error } = await supabase
        .from("metric_responses")
        .select("*")
        .eq("athlete_id", athleteId);
      if (error) {
        console.error("Error fetching all responses for insights:", error);
        return [];
      }
      // Get unique metric IDs
      const metricIds = [...new Set(responses.map((r) => r.metric_id))];
      // Fetch metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from("custom_metrics")
        .select("id, title, type, description")
        .in("id", metricIds);
      if (metricsError) {
        console.error("Error fetching metrics for insights:", metricsError);
        return [];
      }
      // Fetch athlete profile
      const { data: athleteProfile, error: athleteError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, avatar_url, manager_id, created_at"
        )
        .eq("id", athleteId)
        .single();
      if (athleteError) {
        console.error(
          "Error fetching athlete profile for insights:",
          athleteError
        );
        return [];
      }
      // Create lookup maps
      const metricsMap = new Map(metricsData.map((m) => [m.id, m]));
      // Combine the data
      const formattedResponses = responses.map((response) => ({
        id: response.id,
        created_at: response.created_at,
        athlete_id: response.athlete_id,
        metric_id: response.metric_id,
        rating_value: response.rating_value,
        text_value: response.text_value,
        athlete: athleteProfile,
        metric: {
          title: metricsMap.get(response.metric_id)?.title || "Unknown Metric",
          type: metricsMap.get(response.metric_id)?.type || "rating",
          description: metricsMap.get(response.metric_id)?.description || "",
        },
      }));
      return formattedResponses;
    } catch (error) {
      console.error(
        "Unexpected error in fetchAllMetricResponsesForAthlete:",
        error
      );
      return [];
    }
  };

  // When opening the insights modal, fetch all responses for the athlete
  const handleShowInsights = async (athlete: Profile) => {
    setSelectedAthleteForInsights(athlete);
    setShowInsightsModal(true);
    const allResponses = await fetchAllMetricResponsesForAthlete(athlete.id);
    setInsightsMetricResponses(allResponses);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "min-h-screen transition-colors duration-200",
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-slate-900 via-slate-800 to-slate-900"
          : "from-blue-50 via-indigo-50/50 to-violet-50"
      )}
    >
      {/* Header */}
      <nav
        className={clsx(
          "sticky top-0 z-50 transition-all duration-200",
          theme === "dark"
            ? "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900/95 border-b border-slate-700/50"
            : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                  theme === "dark"
                    ? "bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 shadow-lg shadow-blue-500/20"
                    : "bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-600/20"
                )}
              >
                <span className="text-xl font-bold text-white tracking-wide transform -translate-y-px">
                  T
                </span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  TrackBack
                </h1>
                <span className="text-xs text-white/70">
                  Athlete Feedback System
                </span>
              </div>
            </div>
            {/* Hamburger menu for mobile */}
            <button
              className="sm:hidden p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white ml-auto"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* Desktop Navigation and Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Theme Switcher */}
              <div
                className={clsx(
                  "flex items-center gap-1 p-1 rounded-lg transition-all duration-200 mr-2",
                  theme === "dark"
                    ? "bg-white/10 backdrop-blur-md"
                    : "bg-white/20 backdrop-blur-md"
                )}
              >
                <button
                  onClick={() => setTheme("light")}
                  className={clsx(
                    "p-1.5 rounded-md transition-colors",
                    theme === "light"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  title="Light mode"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={clsx(
                    "p-1.5 rounded-md transition-colors",
                    theme === "system"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  title="System preference"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={clsx(
                    "p-1.5 rounded-md transition-colors",
                    theme === "dark"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  title="Dark mode"
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>
              {/* Navigation Links */}
              <div className="hidden sm:flex items-center">
                {/* Records link moved to the left and uses Trophy icon */}
                <Link
                  to="#athlete-records"
                  onClick={(e) => {
                    e.preventDefault();
                    const recordsSection = document.querySelector(
                      "#athlete-records-section"
                    );
                    if (recordsSection) {
                      recordsSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 text-white/80 hover:text-white hover:bg-white/10 ml-1"
                >
                  <Trophy className="h-4 w-4" />
                  <span>Records</span>
                </Link>
                <Link
                  to="/statistics"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 text-white/80 hover:text-white hover:bg-white/10"
                >
                  <BarChart2 className="h-4 w-4" />
                  <span>Statistics</span>
                </Link>
                <Link
                  to="#daily-responses"
                  onClick={(e) => {
                    e.preventDefault();
                    const responsesSection = document.querySelector(
                      "#daily-responses-section"
                    );
                    if (responsesSection) {
                      responsesSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 text-white/80 hover:text-white hover:bg-white/10 ml-1"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>Daily Responses</span>
                </Link>
                <button
                  onClick={() => setShowMetricsModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 text-white/80 hover:text-white hover:bg-white/10 ml-1"
                >
                  <Settings className="h-4 w-4" />
                  <span>Metrics</span>
                </button>
              </div>
              <div className="h-5 w-px mx-2 bg-white/20"></div>
              {/* User Menu */}
              <div className="flex items-center rounded-full py-1 pl-1 pr-3 transition-all duration-200 bg-white/10 backdrop-blur-md hover:bg-white/20">
                <ProfilePicture
                  profile={profile}
                  size="sm"
                  editable={true}
                  onUpdate={handleProfileUpdate}
                />
                <div className="ml-3 mr-2">
                  <p className="text-sm font-medium line-clamp-1 text-white">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-white/70">Manager</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 text-white/80 hover:text-white hover:bg-white/10 ml-1"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex sm:hidden">
            <div
              className={clsx(
                "w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-xl flex flex-col p-6 gap-6 animate-slide-in-left",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              <button
                className="self-end mb-4 p-2 rounded-md hover:bg-slate-800/20 dark:hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
              {/* Navigation Links - fix contrast */}
              <Link
                to="#athlete-records"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  const recordsSection = document.querySelector(
                    "#athlete-records-section"
                  );
                  if (recordsSection) {
                    recordsSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium hover:bg-blue-100 dark:hover:bg-slate-800/40 text-gray-900 dark:text-blue-200"
              >
                <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                Records
              </Link>
              <Link
                to="/statistics"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium hover:bg-blue-100 dark:hover:bg-slate-800/40 text-gray-900 dark:text-blue-200"
              >
                <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                Statistics
              </Link>
              <Link
                to="#daily-responses"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  const responsesSection = document.querySelector(
                    "#daily-responses-section"
                  );
                  if (responsesSection) {
                    responsesSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium hover:bg-blue-100 dark:hover:bg-slate-800/40 text-gray-900 dark:text-blue-200"
              >
                <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                Daily Responses
              </Link>
              <button
                onClick={() => {
                  setShowMetricsModal(true);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium hover:bg-blue-100 dark:hover:bg-slate-800/40 text-gray-900 dark:text-blue-200"
              >
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                Metrics
              </button>
              <div className="border-t border-gray-200 dark:border-slate-700 my-4" />
              {/* Theme Switcher */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTheme("light")}
                  className={clsx(
                    "p-2 rounded-md",
                    theme === "light"
                      ? "bg-blue-100 text-blue-600 dark:bg-slate-700 dark:text-white"
                      : "text-gray-700 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-800/40"
                  )}
                  title="Light mode"
                >
                  <Sun className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={clsx(
                    "p-2 rounded-md",
                    theme === "system"
                      ? "bg-blue-100 text-blue-600 dark:bg-slate-700 dark:text-white"
                      : "text-gray-700 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-800/40"
                  )}
                  title="System preference"
                >
                  <Monitor className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={clsx(
                    "p-2 rounded-md",
                    theme === "dark"
                      ? "bg-blue-100 text-blue-600 dark:bg-slate-700 dark:text-white"
                      : "text-gray-700 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-800/40"
                  )}
                  title="Dark mode"
                >
                  <Moon className="w-5 h-5" />
                </button>
              </div>
              {/* User Info and Logout */}
              <div className="flex items-center gap-3 mb-4">
                <ProfilePicture
                  profile={profile}
                  size="sm"
                  editable={true}
                  onUpdate={handleProfileUpdate}
                />
                <div>
                  <p className="text-base font-medium line-clamp-1">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Manager
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </div>
            {/* Click outside to close */}
            <div
              className="flex-1"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu overlay"
            />
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form Status Settings */}
        <div
          className={clsx(
            "rounded-2xl shadow-sm p-8 mb-8 transition-all duration-200",
            theme === "dark"
              ? "bg-slate-800/50 ring-1 ring-slate-700/50 backdrop-blur-xl"
              : "bg-white/90 shadow-xl shadow-blue-900/5 backdrop-blur-xl"
          )}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className={clsx(
                  "p-4 rounded-2xl",
                  theme === "dark"
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                )}
              >
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2
                  className={clsx(
                    "text-2xl font-bold",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Form Status Settings
                </h2>
                {formStatus?.is_open && (
                  <p
                    className={clsx(
                      "text-sm mt-2 flex items-center gap-2",
                      theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Forms open until {formatTimeForInput(formStatus.close_time)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <label
                className={clsx(
                  "block text-sm font-medium mb-2",
                  theme === "dark" ? "text-slate-300" : "text-gray-700"
                )}
              >
                Open Time
              </label>
              <input
                type="time"
                value={formatTimeForInput(formStatus?.open_time)}
                onChange={(e) =>
                  handleUpdateFormStatus(
                    formStatus?.is_open || false,
                    e.target.value,
                    formStatus?.close_time || "23:59"
                  )
                }
                className={clsx(
                  "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all duration-200",
                  theme === "dark"
                    ? "bg-slate-900/50 border-slate-700 text-white focus:border-blue-500/50"
                    : "bg-white border-gray-300 text-gray-900"
                )}
              />
            </div>

            <div>
              <label
                className={clsx(
                  "block text-sm font-medium mb-2",
                  theme === "dark" ? "text-slate-300" : "text-gray-700"
                )}
              >
                Close Time
              </label>
              <input
                type="time"
                value={formatTimeForInput(formStatus?.close_time)}
                onChange={(e) =>
                  handleUpdateFormStatus(
                    formStatus?.is_open || false,
                    formStatus?.open_time || "00:00",
                    e.target.value
                  )
                }
                className={clsx(
                  "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all duration-200",
                  theme === "dark"
                    ? "bg-slate-900/50 border-slate-700 text-white focus:border-blue-500/50"
                    : "bg-white border-gray-300 text-gray-900"
                )}
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div
          className={clsx(
            "rounded-2xl shadow-sm p-6 mb-8 transition-all duration-200",
            theme === "dark"
              ? "bg-slate-800/50 ring-1 ring-slate-700/50 backdrop-blur-xl"
              : "bg-white/90 shadow-xl shadow-blue-900/5 backdrop-blur-xl"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className={clsx(
                "p-3 rounded-xl",
                theme === "dark"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-blue-100 text-blue-600"
              )}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2
                className={clsx(
                  "text-lg font-semibold",
                  theme === "dark" ? "text-white" : "text-gray-900"
                )}
              >
                Notification Settings
              </h2>
              <p
                className={clsx(
                  "text-sm",
                  theme === "dark" ? "text-slate-400" : "text-gray-500"
                )}
              >
                Configure daily reminder settings
              </p>
            </div>
          </div>

          {/* Settings Content */}
          <div className="space-y-6">
            {/* Daily Reminder Time */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label
                    className={clsx(
                      "block text-sm font-medium",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}
                  >
                    Daily Reminder Time
                  </label>
                  <p
                    className={clsx(
                      "text-xs mt-1",
                      theme === "dark" ? "text-slate-400" : "text-gray-500"
                    )}
                  >
                    Set the time when daily reminders will be sent to athletes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={globalReminderTime}
                    onChange={(e) => setGlobalReminderTime(e.target.value)}
                    className={clsx(
                      "px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 transition-all duration-200",
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-700 text-white focus:border-blue-500/50"
                        : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                  <button
                    onClick={() =>
                      handleUpdateGlobalReminderTime(globalReminderTime)
                    }
                    disabled={isUpdatingGlobalReminder}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isUpdatingGlobalReminder
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : theme === "dark"
                        ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-1 ring-blue-400/30"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>

            {/* Enable Reminders */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label
                    className={clsx(
                      "block text-sm font-medium",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}
                  >
                    Enable Reminders
                  </label>
                  <p
                    className={clsx(
                      "text-xs mt-1",
                      theme === "dark" ? "text-slate-400" : "text-gray-500"
                    )}
                  >
                    Athletes will receive email reminders to submit their
                    training
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formStatus?.enable_reminders ?? true}
                    onChange={(e) => handleToggleReminders(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    className={clsx(
                      "relative w-11 h-6 rounded-full peer",
                      theme === "dark"
                        ? "bg-slate-700 peer-checked:bg-blue-600"
                        : "bg-gray-200 peer-checked:bg-blue-600",
                      "peer-focus:outline-none peer-focus:ring-4",
                      theme === "dark"
                        ? "peer-focus:ring-blue-800"
                        : "peer-focus:ring-blue-300",
                      "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
                      "after:bg-white after:rounded-full after:h-5 after:w-5",
                      "after:transition-all peer-checked:after:translate-x-full"
                    )}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Training Programs Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div
              className={clsx(
                "p-4 rounded-2xl",
                theme === "dark"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
              )}
            >
              <Dumbbell className="w-6 h-6" />
            </div>
            <h2
              className={clsx(
                "text-2xl font-bold",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Training Programs
            </h2>
          </div>
          <TrainingProgramManager
            managerId={profile.id}
            athletes={athletes}
            theme={theme}
          />
        </div>

        {/* Performance Report Section */}
        <div
          className={clsx(
            "rounded-2xl shadow-lg bg-white/90 border border-gray-100 p-6 mb-12 w-full max-w-full mx-auto",
            theme === "dark" ? "bg-slate-800/70 ring-1 ring-slate-700/50" : ""
          )}
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className={clsx(
                "p-4 rounded-2xl",
                theme === "dark"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
              )}
            >
              <BarChart2 className="w-6 h-6" />
            </div>
            <h2
              className={clsx(
                "text-2xl font-bold",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Performance Report
            </h2>
          </div>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <label
              className={clsx(
                "font-medium",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Select Athlete:
            </label>
            <select
              value={performanceReportAthlete}
              onChange={(e) => setPerformanceReportAthlete(e.target.value)}
              className={clsx(
                "px-4 py-2 rounded-lg border text-sm pr-12 min-w-[200px] shadow-sm transition-all duration-200 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white hover:bg-blue-50",
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-700 text-white hover:bg-slate-800"
                  : "bg-white border-gray-300 text-gray-900 hover:bg-blue-50"
              )}
              style={{ appearance: "none" }}
            >
              <option value="">-- Select --</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
          </div>
          {performanceReportAthlete ? (
            <WeightReport athleteId={performanceReportAthlete} theme={theme} />
          ) : (
            <div className="text-center text-gray-500 py-8">
              Select an athlete to view their performance report.
            </div>
          )}
        </div>

        {/* Athletes List */}
        <div
          className={clsx(
            "rounded-2xl shadow-sm overflow-hidden mb-8",
            theme === "dark"
              ? "bg-[#1E293B]/80 border border-slate-700/50 backdrop-blur-sm"
              : "bg-white border border-gray-100"
          )}
        >
          {/* Responsive horizontal pill tab bar */}
          <div className="flex justify-center mt-4 mb-2">
            <div className="flex flex-row gap-2 max-w-xl w-full rounded-lg shadow bg-white border border-gray-200 p-1">
              <button
                className={clsx(
                  "flex-1 px-6 py-1.5 text-base font-medium rounded-lg transition-all duration-200 whitespace-nowrap focus:outline-none",
                  athleteTab === "athletes"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-700"
                )}
                data-active={athleteTab === "athletes"}
                onClick={() => setAthleteTab("athletes")}
              >
                <Users className="h-4 w-4 inline-block mr-1" /> Athletes
              </button>
              <button
                className={clsx(
                  "flex-1 px-6 py-1.5 text-base font-medium rounded-lg transition-all duration-200 whitespace-nowrap focus:outline-none",
                  athleteTab === "invite"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-700"
                )}
                data-active={athleteTab === "invite"}
                onClick={() => setAthleteTab("invite")}
              >
                <UserPlus className="h-4 w-4 inline-block mr-1" /> Invite
                Athlete
              </button>
            </div>
          </div>
          {athleteTab === "athletes" && (
            <div className="mt-4 overflow-x-auto w-full">
              <table
                className={clsx(
                  "min-w-full rounded-xl shadow bg-white border border-gray-200 text-sm",
                  theme === "dark" ? "divide-slate-700/50" : "divide-gray-200"
                )}
              >
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={clsx(
                    "divide-y",
                    theme === "dark" ? "divide-slate-700/50" : "divide-gray-200"
                  )}
                >
                  {athletes.map((athlete) => (
                    <tr
                      key={athlete.id}
                      className="transition hover:bg-blue-50"
                    >
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <ProfilePicture profile={athlete} size="sm" />
                          </div>
                          <div className="ml-3">
                            <div
                              className={clsx(
                                "text-sm font-medium",
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              )}
                            >
                              {athlete.full_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div
                          className={clsx(
                            "text-sm",
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-gray-500"
                          )}
                        >
                          {athlete.email}
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleShowInsights(athlete)}
                            className={clsx(
                              "inline-flex items-center px-3 py-1.5 rounded-xl font-medium shadow transition-all duration-200 text-xs",
                              theme === "dark"
                                ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 ring-1 ring-blue-500/30"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                            )}
                          >
                            <Brain className="h-4 w-4 mr-1" />
                            <span className="relative">AI Insights</span>
                          </button>
                          <button
                            onClick={(e) => handleRemoveAthlete(athlete.id, e)}
                            className={clsx(
                              "inline-flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200",
                              theme === "dark"
                                ? "text-red-400 hover:bg-red-500/10"
                                : "text-red-600 hover:bg-red-50"
                            )}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {athleteTab === "invite" && (
            <InviteAthleteModal
              isOpen={true}
              onClose={() => setAthleteTab("athletes")}
              onInviteSuccess={() => setAthleteTab("athletes")}
              managerId={profile.id}
            />
          )}
        </div>

        {/* Active Invitations Section */}
        <div
          className={clsx(
            "mt-8 mb-10 rounded-2xl transition-all duration-200",
            theme === "dark"
              ? "bg-slate-800/50 border border-slate-700/50"
              : "bg-white border border-gray-200/50"
          )}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    theme === "dark" ? "bg-indigo-500/10" : "bg-indigo-50"
                  )}
                >
                  <UserPlus
                    className={clsx(
                      "h-5 w-5",
                      theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                    )}
                  />
                </div>
                <div>
                  <h2
                    className={clsx(
                      "text-lg font-semibold",
                      theme === "dark" ? "text-white" : "text-gray-900"
                    )}
                  >
                    Active Invitations
                  </h2>
                  <p
                    className={clsx(
                      "text-sm",
                      theme === "dark" ? "text-slate-400" : "text-gray-500"
                    )}
                  >
                    Manage your pending athlete invitations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200",
                  theme === "dark"
                    ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                )}
              >
                <UserPlus className="h-4 w-4" />
                Invite Athlete
              </button>
            </div>

            {visibleInvitations.length > 0 ? (
              <div
                className={clsx(
                  "rounded-xl overflow-hidden",
                  theme === "dark" ? "bg-slate-900/50" : "bg-gray-50"
                )}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead
                      className={clsx(
                        theme === "dark" ? "bg-slate-800/50" : "bg-gray-50"
                      )}
                    >
                      <tr>
                        <th
                          scope="col"
                          className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-gray-500"
                          )}
                        >
                          Invitation Code
                        </th>
                        <th
                          scope="col"
                          className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-gray-500"
                          )}
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-gray-500"
                          )}
                        >
                          Expires
                        </th>
                        <th
                          scope="col"
                          className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-gray-500"
                          )}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className={clsx(
                        "divide-y",
                        theme === "dark"
                          ? "divide-slate-700/50"
                          : "divide-gray-200"
                      )}
                    >
                      {visibleInvitations.map((invitation) => (
                        <tr
                          key={invitation.id}
                          className={clsx(
                            theme === "dark"
                              ? "hover:bg-slate-800/50"
                              : "hover:bg-gray-50"
                          )}
                        >
                          <td
                            className={clsx(
                              "px-6 py-4 whitespace-nowrap text-sm",
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-gray-900"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span>{invitation.invitation_code}</span>
                              <button
                                onClick={() =>
                                  handleCopyLink(invitation.invitation_code)
                                }
                                className={clsx(
                                  "p-1 rounded hover:bg-opacity-80 transition-colors",
                                  theme === "dark"
                                    ? "hover:bg-slate-700"
                                    : "hover:bg-gray-100"
                                )}
                                title="Copy invitation link"
                              >
                                <Copy
                                  className={clsx(
                                    "h-4 w-4",
                                    theme === "dark"
                                      ? "text-slate-400"
                                      : "text-gray-500"
                                  )}
                                />
                              </button>
                              {showCopyNotification ===
                                invitation.invitation_code && (
                                <span
                                  className={clsx(
                                    "text-xs",
                                    theme === "dark"
                                      ? "text-slate-400"
                                      : "text-gray-500"
                                  )}
                                >
                                  Copied!
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className={clsx(
                              "px-6 py-4 whitespace-nowrap text-sm",
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-gray-900"
                            )}
                          >
                            <span
                              className={clsx(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                new Date(invitation.expires_at) > new Date()
                                  ? theme === "dark"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-emerald-100 text-emerald-800"
                                  : theme === "dark"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {new Date(invitation.expires_at) > new Date()
                                ? "Active"
                                : "Expired"}
                            </span>
                          </td>
                          <td
                            className={clsx(
                              "px-6 py-4 whitespace-nowrap text-sm",
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-gray-900"
                            )}
                          >
                            {new Date(invitation.expires_at).toLocaleString(
                              undefined,
                              {
                                year: "numeric",
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() =>
                                handleDeleteInvitation(invitation.id)
                              }
                              className={clsx(
                                "p-1.5 rounded-lg transition-colors",
                                theme === "dark"
                                  ? "text-red-400 hover:bg-red-500/10"
                                  : "text-red-600 hover:bg-red-50"
                              )}
                              title="Delete invitation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                className={clsx(
                  "text-center py-12 rounded-xl",
                  theme === "dark" ? "bg-slate-900/50" : "bg-gray-50"
                )}
              >
                <UserPlus
                  className={clsx(
                    "mx-auto h-12 w-12",
                    theme === "dark" ? "text-slate-600" : "text-gray-400"
                  )}
                />
                <h3
                  className={clsx(
                    "mt-2 text-sm font-medium",
                    theme === "dark" ? "text-slate-300" : "text-gray-900"
                  )}
                >
                  No active invitations
                </h3>
                <p
                  className={clsx(
                    "mt-1 text-sm",
                    theme === "dark" ? "text-slate-400" : "text-gray-500"
                  )}
                >
                  Get started by inviting your first athlete
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Responses */}
        <div
          id="daily-responses-section"
          className={clsx(
            "rounded-2xl shadow-sm overflow-hidden mb-8",
            theme === "dark"
              ? "bg-slate-800/50 ring-1 ring-slate-700/50 backdrop-blur-xl"
              : "bg-white/90 shadow-xl shadow-blue-900/5 backdrop-blur-xl"
          )}
        >
          <div
            className={clsx(
              "px-8 py-6 border-b",
              theme === "dark" ? "border-slate-700/50" : "border-gray-100"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={clsx(
                  "p-4 rounded-2xl",
                  theme === "dark"
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                )}
              >
                <Calendar className="w-6 h-6" />
              </div>
              <h2
                className={clsx(
                  "text-2xl font-bold",
                  theme === "dark" ? "text-white" : "text-gray-900"
                )}
              >
                Daily Responses
              </h2>
            </div>

            {/* Add the filters section here */}
            <div className="mt-6 flex flex-row items-end justify-between gap-8">
              <div className="sm:w-1/2">
                <label
                  className={clsx(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  )}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={clsx(
                    "w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500/50 transition-all duration-200",
                    theme === "dark"
                      ? "bg-slate-900/50 border-slate-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>
              <div className="sm:w-1/3 sm:text-right">
                <label
                  className={clsx(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  )}
                >
                  Athlete
                </label>
                <select
                  value={selectedAthlete}
                  onChange={(e) => setSelectedAthlete(e.target.value)}
                  className={clsx(
                    "w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 appearance-none flex items-center bg-no-repeat",
                    theme === "dark"
                      ? "bg-slate-900/50 border-slate-700 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                    "pr-10" // add right padding for arrow
                  )}
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml;utf8,<svg fill='none' stroke='%23333' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'></path></svg>')",
                    backgroundPosition: "right 0.75rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.25em 1.25em",
                  }}
                >
                  <option value="all">All Athletes</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {metricResponses.length > 0 ? (
            <GroupedMetricResponses responses={metricResponses} />
          ) : (
            <div className="p-8 text-center">
              <div
                className={clsx(
                  "mx-auto flex items-center justify-center h-16 w-16 rounded-2xl mb-4",
                  theme === "dark"
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                )}
              >
                <Calendar className="h-8 w-8" />
              </div>
              <h3
                className={clsx(
                  "text-xl font-semibold mb-2",
                  theme === "dark" ? "text-white" : "text-gray-900"
                )}
              >
                No Responses Yet
              </h3>
              <p
                className={clsx(
                  "text-sm max-w-sm mx-auto",
                  theme === "dark" ? "text-slate-400" : "text-gray-500"
                )}
              >
                No feedback has been submitted for the selected date. Responses
                will appear here once athletes submit their daily forms.
              </p>
            </div>
          )}
        </div>

        {/* Team Leaderboard Section */}
        <div
          id="team-leaderboard-section"
          className={clsx(
            "rounded-2xl shadow-sm overflow-hidden mb-8",
            theme === "dark"
              ? "bg-slate-800/50 ring-1 ring-slate-700/50 backdrop-blur-xl"
              : "bg-white/90 shadow-xl shadow-blue-900/5 backdrop-blur-xl"
          )}
        >
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div
                className={clsx(
                  "p-4 rounded-2xl",
                  theme === "dark"
                    ? "bg-yellow-500/10 text-yellow-400"
                    : "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white"
                )}
              >
                <Trophy className="w-6 h-6" />
              </div>
              <h2
                className={clsx(
                  "text-2xl font-bold",
                  theme === "dark" ? "text-white" : "text-gray-900"
                )}
              >
                Team Leaderboard
              </h2>
            </div>
            <TeamPersonalBests
              currentAthlete={profile}
              managerId={profile.id}
            />
          </div>
        </div>

        {/* Athlete Personal Records Section */}
        <section
          id="athlete-records-section"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 scroll-mt-24"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.142 0 7.5-3.358 7.5-7.5S16.142 5.5 12 5.5 4.5 8.858 4.5 13s3.358 7.5 7.5 7.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-400 bg-clip-text text-transparent">
              Athlete Personal Best
            </h2>
          </div>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <label
              className={clsx(
                "font-medium",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Select Athlete:
            </label>
            <select
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
              className={clsx(
                "px-4 py-2 rounded-lg border text-sm pr-12 min-w-[200px] shadow-sm transition-all duration-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white hover:bg-yellow-50",
                "bg-[url('data:image/svg+xml;utf8,<svg fill='none' stroke='%23333' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'></path></svg>')] bg-no-repeat bg-[right_1rem_center]",
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-700 text-white hover:bg-slate-800"
                  : "bg-white border-gray-300 text-gray-900 hover:bg-yellow-50"
              )}
              style={{ appearance: "none" }}
            >
              <option value="">-- Select --</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
          </div>
          {selectedAthlete &&
            selectedAthlete !== "" &&
            selectedAthlete !== "all" && (
              <div
                className={clsx(
                  "rounded-2xl shadow-lg bg-white/90 border border-gray-100 p-2 sm:p-8 mt-8 mb-12 w-full max-w-full mx-auto flex flex-col items-center",
                  theme === "dark"
                    ? "bg-slate-800/70 ring-1 ring-slate-700/50"
                    : ""
                )}
              >
                <h3
                  className={clsx(
                    "text-xl font-bold mb-6 w-full text-center",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Performance Report
                </h3>

                <div className="w-full">
                  <h4
                    className={clsx(
                      "text-lg font-semibold mb-4",
                      theme === "dark" ? "text-white" : "text-gray-900"
                    )}
                  >
                    Personal Best Overview
                  </h4>
                  <div className="w-full flex justify-end mb-4">
                    <button
                      onClick={() => {
                        setPRForm({
                          exercise: "",
                          weight: 0,
                          record_date: "",
                          video_url: "",
                          notes: "",
                        });
                        setEditingPRId(null);
                        setShowPRModal(true);
                      }}
                      className="px-5 py-2 rounded-lg font-medium text-sm bg-yellow-400 text-white hover:bg-yellow-500 transition shadow"
                    >
                      + Add Record
                    </button>
                  </div>
                  <div className="w-full">
                    <PersonalRecordsTable
                      athleteId={selectedAthlete}
                      showModal={showPRModal}
                      setShowModal={(show) => {
                        setShowPRModal(show);
                        if (!show) setPRRefreshKey((k) => k + 1); // refresh after closing modal
                      }}
                      form={prForm}
                      setForm={setPRForm}
                      editingId={editingPRId}
                      setEditingId={setEditingPRId}
                      canEdit={true}
                      refreshKey={prRefreshKey}
                    />
                  </div>
                  <div className="my-6 border-t border-gray-200 w-full" />
                  <div className="w-full">
                    <PersonalRecordsChart
                      athleteId={selectedAthlete}
                      refreshKey={prRefreshKey}
                    />
                  </div>
                </div>
              </div>
            )}
        </section>
      </main>

      {showMetricsModal && !showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={clsx(
              "rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transition-all duration-200",
              theme === "dark"
                ? "bg-slate-800/90 ring-1 ring-slate-700/50 backdrop-blur-xl"
                : "bg-white/90 shadow-xl shadow-blue-900/5 backdrop-blur-xl"
            )}
          >
            <div className="sticky top-0 z-10 px-8 py-6 border-b backdrop-blur-xl bg-inherit transition-colors duration-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2
                    className={clsx(
                      "text-2xl font-bold",
                      theme === "dark" ? "text-white" : "text-gray-900"
                    )}
                  >
                    Manage Metrics
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <p
                      className={clsx(
                        "text-sm",
                        theme === "dark" ? "text-slate-400" : "text-gray-500"
                      )}
                    >
                      {metrics.length}/10 metrics used
                    </p>
                    <span
                      className={clsx(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        metrics.length >= 10
                          ? "bg-red-100 text-red-700"
                          : metrics.length >= 7
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {10 - metrics.length} remaining
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeMetricsModal}
                  className={clsx(
                    "p-2 rounded-lg transition-colors",
                    theme === "dark"
                      ? "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Quick Start Guide */}
              <div
                className={clsx(
                  "rounded-xl p-6 mb-8",
                  theme === "dark"
                    ? "bg-blue-500/5 ring-1 ring-blue-500/20"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
                )}
              >
                <h3
                  className={clsx(
                    "text-lg font-semibold mb-4 flex items-center gap-2",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  <Info
                    className={clsx(
                      "w-5 h-5",
                      theme === "dark" ? "text-blue-400" : "text-blue-500"
                    )}
                  />
                  Quick Start Guide
                </h3>
                <div className="space-y-4">
                  {[
                    "Create metrics to track athlete performance and well-being (max 10 metrics)",
                    "Choose between rating (1-5 scale) or text response types",
                    "Add clear descriptions to help athletes understand what to report",
                    "Monitor responses in the Daily Responses section",
                  ].map((text, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div
                        className={clsx(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                          theme === "dark"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-blue-100 text-blue-600"
                        )}
                      >
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <p
                        className={clsx(
                          "text-sm",
                          theme === "dark" ? "text-slate-300" : "text-gray-600"
                        )}
                      >
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Message */}
              {successMessage && (
                <div
                  className={clsx(
                    "mb-6 p-4 rounded-lg flex items-center gap-2",
                    theme === "dark"
                      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  )}
                >
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-medium">{successMessage}</p>
                </div>
              )}

              {metrics.length > 0 && (
                <div className="mb-8">
                  <h3
                    className={clsx(
                      "text-lg font-semibold mb-4",
                      theme === "dark" ? "text-white" : "text-gray-900"
                    )}
                  >
                    Current Metrics
                  </h3>
                  <div className="space-y-3">
                    {metrics.map((metric) => (
                      <div
                        key={metric.id}
                        className={clsx(
                          "rounded-lg p-4 transition-colors duration-200",
                          theme === "dark"
                            ? "bg-slate-900/50 ring-1 ring-slate-700/50"
                            : "bg-gray-50 border border-gray-200"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4
                              className={clsx(
                                "text-base font-medium",
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              )}
                            >
                              {metric.title}
                            </h4>
                            {metric.description && (
                              <p
                                className={clsx(
                                  "text-sm mt-1",
                                  theme === "dark"
                                    ? "text-slate-400"
                                    : "text-gray-500"
                                )}
                              >
                                {metric.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={clsx(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                theme === "dark"
                                  ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30"
                                  : "bg-blue-100 text-blue-800"
                              )}
                            >
                              {metric.type === "rating"
                                ? "Rating (1-5)"
                                : "Text"}
                            </span>
                            <button
                              onClick={() => confirmDeleteMetric(metric)}
                              className={clsx(
                                "p-1.5 rounded-lg transition-colors",
                                theme === "dark"
                                  ? "text-red-400 hover:bg-red-500/10"
                                  : "text-red-600 hover:bg-red-50"
                              )}
                              title="Delete metric"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3
                  className={clsx(
                    "text-lg font-semibold mb-4",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Add New Metric
                </h3>
                <MetricForm
                  onSubmit={handleCreateMetric}
                  onCancel={() => setShowMetricsModal(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && metricToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-md w-full">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Delete Metric
              </h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the metric "
                  {metricToDelete.title}"? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 sm:space-x-3">
              <button
                onClick={cancelDeleteMetric}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMetric}
                disabled={!!deletingMetricId}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                type="button"
              >
                {deletingMetricId ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <InviteAthleteModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setTimeout(() => setRefreshKey((k) => k + 1), 100);
        }}
        onInviteSuccess={() => {
          setShowInviteModal(false);
        }}
        managerId={profile.id}
      />

      {/* Add error message display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          <p className="flex items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-700 hover:text-red-900"
            >
              <X className="h-4 w-4" />
            </button>
          </p>
        </div>
      )}

      {/* Footer */}
      <footer
        className={clsx(
          "mt-8 transition-all duration-200",
          theme === "dark"
            ? "bg-slate-800/50 border-t border-slate-700/50 backdrop-blur-xl"
            : "bg-white/90 border-t border-gray-200/50 backdrop-blur-xl"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                    theme === "dark"
                      ? "bg-gradient-to-br from-violet-500 via-purple-500 to-violet-600 shadow-lg shadow-violet-500/20"
                      : "bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 shadow-lg shadow-violet-600/20"
                  )}
                >
                  <span className="text-xl font-bold text-white tracking-wide transform -translate-y-px">
                    T
                  </span>
                </div>
                <h3
                  className={clsx(
                    "text-xl font-bold",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  TrackBack
                </h3>
              </div>
              <p
                className={clsx(
                  "text-sm leading-relaxed",
                  theme === "dark" ? "text-slate-400" : "text-gray-500"
                )}
              >
                Empowering athletes and managers with data-driven insights for
                better performance tracking and team management.
              </p>
            </div>
            <div>
              <h3
                className={clsx(
                  "text-lg font-semibold mb-6",
                  theme === "dark" ? "text-white" : "text-gray-900"
                )}
              >
                Contact
              </h3>
              <div className="space-y-4">
                <p
                  className={clsx(
                    "text-sm flex items-center gap-2",
                    theme === "dark" ? "text-slate-400" : "text-gray-500"
                  )}
                >
                  <Mail className="h-4 w-4" />
                  martinsfrancisco2005@gmail.com
                </p>
                <p
                  className={clsx(
                    "text-sm flex items-center gap-2",
                    theme === "dark" ? "text-slate-400" : "text-gray-500"
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  Porto, Portugal
                </p>
              </div>
            </div>
            <div>
              <h3
                className={clsx(
                  "text-lg font-semibold mb-6",
                  theme === "dark" ? "text-white" : "text-gray-900"
                )}
              >
                Legal
              </h3>
              <div className="space-y-4">
                <Link
                  to="/privacy-policy"
                  className={clsx(
                    "text-sm flex items-center gap-2 transition-colors duration-200",
                    theme === "dark"
                      ? "text-slate-400 hover:text-white"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Privacy Policy
                </Link>
                <Link
                  to="/terms-of-service"
                  className={clsx(
                    "text-sm flex items-center gap-2 transition-colors duration-200",
                    theme === "dark"
                      ? "text-slate-400 hover:text-white"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
          <div
            className={clsx(
              "mt-12 pt-8 border-t text-center",
              theme === "dark" ? "border-slate-700/50" : "border-gray-200/50"
            )}
          >
            <p
              className={clsx(
                "text-sm",
                theme === "dark" ? "text-slate-400" : "text-gray-500"
              )}
            >
              © {new Date().getFullYear()} TrackBack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Add the Insights Modal */}
      {showInsightsModal && selectedAthleteForInsights && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <ProfilePicture
                  profile={selectedAthleteForInsights}
                  size="lg"
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedAthleteForInsights.full_name}
                  </h2>
                  <p className="text-blue-200">Performance Insights</p>
                </div>
              </div>
              <button
                onClick={() => setShowInsightsModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <AthletesInsights
              athleteId={selectedAthleteForInsights.id}
              data={transformMetricResponses(
                insightsMetricResponses,
                selectedAthleteForInsights.id
              )}
              model="gpt-3.5-turbo"
            />
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed inset-x-0 top-20 flex justify-center z-50">
          <div
            className={clsx(
              "px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-4",
              theme === "dark"
                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 backdrop-blur-xl"
                : "bg-white text-emerald-700 border border-emerald-100 shadow-emerald-100/50"
            )}
          >
            <div
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
              )}
            >
              <Check className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed inset-x-0 top-20 flex justify-center z-50">
          <div
            className={clsx(
              "px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-4",
              theme === "dark"
                ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30 backdrop-blur-xl"
                : "bg-white text-red-700 border border-red-100 shadow-red-100/50"
            )}
          >
            <div
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                theme === "dark" ? "bg-red-500/20" : "bg-red-100"
              )}
            >
              <X className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
