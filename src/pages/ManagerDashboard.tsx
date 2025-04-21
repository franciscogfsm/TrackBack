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
} from "lucide-react";
import clsx from "clsx";
import ProfilePicture from "../components/ProfilePicture";
import InviteAthleteModal from "../components/InviteAthleteModal";
import type { Tables } from "../lib/database.types";
import AthletesInsights from "../components/AthletesInsights";
import type { PerformanceData } from "../services/aiInsights";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"rating" | "text">("rating");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    onSubmit({ title, description, type });
    // Reset form
    setTitle("");
    setDescription("");
    setType("rating");
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg space-y-6">
      <div>
        <label
          htmlFor="title"
          className="block text-base font-medium text-gray-900 mb-2"
        >
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Enter metric title"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label
          htmlFor="description"
          className="block text-base font-medium text-gray-900 mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Enter metric description (optional)"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label
          htmlFor="type"
          className="block text-base font-medium text-gray-900 mb-2"
        >
          Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as "rating" | "text")}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="rating">Rating (1-5)</option>
          <option value="text">Text</option>
        </select>
      </div>
      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Create Metric
        </button>
      </div>
    </form>
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
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [selectedAthlete, setSelectedAthlete] = useState<string>("all");
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricResponses, setMetricResponses] = useState<
    MetricResponseWithDetails[]
  >([]);
  const [formStatus, setFormStatus] = useState<FormStatus | null>(null);
  const [deletingMetricId, setDeletingMetricId] = useState<number | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null);
  const [invitations, setInvitations] = useState<
    ManagerInvitationWithProfile[]
  >([]);
  const [hiddenInvitations, setHiddenInvitations] = useState<Set<string>>(
    new Set()
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState<Profile | null>(null);
  const [newAthleteId, setNewAthleteId] = useState<string>("");
  const [availableAthletes, setAvailableAthletes] = useState<Profile[]>([]);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState<
    string | null
  >(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [selectedAthleteForInsights, setSelectedAthleteForInsights] =
    useState<Profile | null>(null);

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
      const { data: responses, error } = await supabase
        .from("metric_responses")
        .select("*")
        .eq("date", selectedDate);

      if (error) {
        console.error("Error fetching responses:", error);
        return;
      }

      if (!responses || responses.length === 0) {
        setMetricResponses([]);
        return;
      }

      // Get unique athlete IDs and metric IDs
      const athleteIds = [...new Set(responses.map((r) => r.athlete_id))];
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

      // Close the modal
      setShowMetricsModal(false);
    } catch (error) {
      console.error("Error in handleCreateMetric:", error);
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

      // Fetch form status for this manager
      const { data: formStatusData, error: formStatusError } = await supabase
        .from("daily_form_status")
        .select("*")
        .eq("manager_id", profile.id)
        .maybeSingle();

      if (formStatusError && formStatusError.code !== "PGRST116") {
        console.error("Error fetching form status:", formStatusError);
      } else {
        setFormStatus(formStatusData || null);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <nav className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-blue-600 text-xl font-bold">T</span>
              </div>
              <h1 className="text-2xl font-bold text-white">TrackBack</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/statistics")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Statistics</span>
              </button>
              <button
                onClick={() => setShowMetricsModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Metrics</span>
              </button>
              <div className="h-6 w-px bg-white/20"></div>
              <div className="flex items-center bg-white/10 rounded-full py-1 pl-1 pr-4">
                <ProfilePicture
                  profile={profile}
                  size="sm"
                  editable={true}
                  onUpdate={handleProfileUpdate}
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-blue-100">Manager</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Form Status Settings */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Form Status Settings
                </h2>
                {formStatus?.is_open && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Forms open until {formatTimeForInput(formStatus.close_time)}
                  </p>
                )}
              </div>
            </div>
            <div
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium",
                formStatus?.is_open
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              )}
            >
              {formStatus?.is_open ? "Forms Open" : "Forms Closed"}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Athletes List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8 border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Athletes
                </h2>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Athlete
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Email
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {athletes.map((athlete) => (
                  <tr key={athlete.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <ProfilePicture profile={athlete} size="md" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {athlete.full_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {athlete.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <div className="relative group">
                          <button
                            onClick={() => {
                              setSelectedAthleteForInsights(athlete);
                              setShowInsightsModal(true);
                            }}
                            className="group relative inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-medium shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:from-blue-500 hover:to-indigo-500 active:scale-95"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-xl blur-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
                            <Brain className="h-4 w-4 mr-1.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                            <span className="relative">AI Insights</span>
                            <div className="absolute -top-1 -right-1">
                              <div className="animate-ping">
                                <div className="h-2 w-2 rounded-full bg-blue-400" />
                              </div>
                              <div className="absolute inset-0">
                                <div className="h-2 w-2 rounded-full bg-blue-400" />
                              </div>
                            </div>
                          </button>

                          {/* Floating tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg p-2 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Sparkles className="h-3 w-3 text-blue-400" />
                                <span className="font-medium">
                                  AI-Powered Analysis
                                </span>
                              </div>
                              <p className="text-gray-300 text-[10px]">
                                Get personalized insights and recommendations
                              </p>
                            </div>
                            <div className="w-2 h-2 bg-gray-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleRemoveAthlete(athlete.id, e)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Date and Athlete Selection */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Athlete
              </label>
              <select
                value={selectedAthlete}
                onChange={(e) => setSelectedAthlete(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

        {/* Team Invitations Section - More Compact */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8 border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  Pending Invitations
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Refresh invitations"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            </div>
          ) : visibleInvitations.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-500">No pending invitations</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleInvitations.map((invitation) => (
                    <tr
                      key={invitation.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {invitation.email || "No email"}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        {invitation.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                handleCopyLink(invitation.invitation_code)
                              }
                              className="inline-flex items-center px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                            >
                              {showCopyNotification ===
                              invitation.invitation_code ? (
                                <span className="flex items-center">
                                  <Check className="h-3 w-3 mr-1" />
                                  Copied
                                </span>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteInvitation(invitation.id)
                              }
                              className="inline-flex items-center px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Daily Responses */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Daily Responses
            </h2>
          </div>

          {metricResponses.length > 0 ? (
            <GroupedMetricResponses responses={metricResponses} />
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Responses Yet
              </h3>
              <p className="text-sm text-gray-500">
                No feedback has been submitted for the selected date.
              </p>
            </div>
          )}
        </div>
      </main>

      {showMetricsModal && !showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-40">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Manage Metrics
              </h2>
              <button
                onClick={closeMetricsModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {metrics.length > 0 && (
              <div className="mb-4 sm:mb-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Current Metrics
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold leading-6 text-gray-900">
                            {metric.title}
                          </h3>
                          {metric.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {metric.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                            {metric.type === "rating" ? "Rating (1-5)" : "Text"}
                          </span>
                          <button
                            onClick={() => confirmDeleteMetric(metric)}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 p-1.5 sm:p-2 rounded hover:bg-red-50"
                            title="Delete metric"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Add New Metric
              </h3>
              <MetricForm
                onSubmit={handleCreateMetric}
                onCancel={() => setShowMetricsModal(false)}
              />
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

      {/* Add footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                TrackBack
              </h3>
              <p className="text-sm text-gray-500">
                Empowering athletes and managers with data-driven insights.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Contact
              </h3>
              <p className="text-sm text-gray-500">
                Email: martinsfrancisco2005@gmail.com
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Legal
              </h3>
              <div className="space-y-2">
                <a
                  href="/privacy-policy"
                  className="text-sm text-gray-500 hover:text-gray-900 block"
                >
                  Privacy Policy
                </a>
                <a
                  href="/terms-of-service"
                  className="text-sm text-gray-500 hover:text-gray-900 block"
                >
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
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
                metricResponses,
                selectedAthleteForInsights.id
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
