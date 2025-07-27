import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type {
  Profile,
  CustomMetric,
  MetricResponse,
} from "../lib/database.types";
import {
  Calendar,
  MessageCircle,
  Star,
  Filter,
  ChevronDown,
  Clock,
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";
import ProfilePicture from "./ProfilePicture";

interface DailyResponsesTabProps {
  profile: Profile;
  athletes: Profile[];
}

interface MetricResponseWithDetails extends MetricResponse {
  athlete: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  metric: {
    title: string;
    type: "rating" | "text";
    description?: string;
  };
}

interface FilterState {
  athleteId: string;
  metricId: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function DailyResponsesTab({
  profile,
  athletes,
}: DailyResponsesTabProps) {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<MetricResponseWithDetails[]>([]);
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    athleteId: "",
    metricId: "",
    dateRange: {
      start: new Date().toISOString().split("T")[0], // Today only by default
      end: new Date().toISOString().split("T")[0], // Today only by default
    },
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedAthletes, setExpandedAthletes] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    fetchMetrics();
  }, [profile.id]);

  useEffect(() => {
    fetchResponses();
  }, [profile.id, athletes, filters, metrics]);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_metrics")
        .select("*")
        .eq("manager_id", profile.id)
        .order("title");

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const fetchResponses = async () => {
    setLoading(true);
    try {
      // Get athlete IDs to filter by
      const athleteIds = filters.athleteId
        ? [filters.athleteId]
        : athletes.map((a) => a.id);

      if (athleteIds.length === 0) {
        setResponses([]);
        setLoading(false);
        return;
      }

      // Use simple query without joins (more reliable)
      let query = supabase
        .from("metric_responses")
        .select("*")
        .gte("date", filters.dateRange.start)
        .lte("date", filters.dateRange.end)
        .in("athlete_id", athleteIds)
        .order("created_at", { ascending: false });

      if (filters.metricId) {
        query = query.eq("metric_id", filters.metricId);
      }

      const { data: responsesData, error: responsesError } = await query;
      if (responsesError) throw responsesError;

      // Manually combine with athlete and metric data
      const transformedResponses: MetricResponseWithDetails[] = (
        responsesData || []
      ).map((response: any) => {
        const athlete = athletes.find((a) => a.id === response.athlete_id);
        const metric = metrics.find((m) => m.id === response.metric_id);

        return {
          ...response,
          athlete: {
            id: athlete?.id || response.athlete_id,
            full_name: athlete?.full_name || "Unknown Athlete",
            avatar_url: athlete?.avatar_url,
          },
          metric: {
            title: metric?.title || "Unknown Metric",
            type: metric?.type || "rating",
            description: metric?.description,
          },
        };
      });

      setResponses(transformedResponses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      setResponses([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600 bg-green-50";
    if (rating >= 3) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  // Remove unused function for now
  // const getAverageRating = (athleteId: string, metricId: string) => {
  //   const athleteMetricResponses = responses.filter(
  //     r => r.athlete_id === athleteId &&
  //          r.metric_id === metricId &&
  //          r.metric.type === "rating" &&
  //          r.rating_value !== null
  //   );

  //   if (athleteMetricResponses.length === 0) return null;

  //   const sum = athleteMetricResponses.reduce((acc, r) => acc + (r.rating_value || 0), 0);
  //   return (sum / athleteMetricResponses.length).toFixed(1);
  // };

  // Group responses by athlete and date for better organization
  const groupedResponses = responses.reduce(
    (acc, response) => {
      const key = `${response.athlete_id}-${response.date}`;
      if (!acc[key]) {
        acc[key] = {
          athlete: response.athlete,
          date: response.date,
          responses: [],
        };
      }
      acc[key].responses.push(response);
      return acc;
    },
    {} as Record<
      string,
      {
        athlete: { id: string; full_name: string; avatar_url?: string };
        date: string;
        responses: MetricResponseWithDetails[];
      }
    >
  );

  const groupedEntries = Object.values(groupedResponses).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Daily Responses
            </h1>
            <p className="text-gray-600">
              View and analyze athlete daily check-in responses
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showFilters ? "Hide" : "Show"} Filters
            <ChevronDown
              className={clsx(
                "w-4 h-4 transition-transform",
                showFilters && "rotate-180"
              )}
            />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Athlete
              </label>
              <select
                value={filters.athleteId}
                onChange={(e) =>
                  setFilters({ ...filters, athleteId: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Athletes</option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metric
              </label>
              <select
                value={filters.metricId}
                onChange={(e) =>
                  setFilters({ ...filters, metricId: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Metrics</option>
                {metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, start: e.target.value },
                  })
                }
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, end: e.target.value },
                  })
                }
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Responses List - Simplified View */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Athlete Responses
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Daily check-in responses grouped by athlete and date
          </p>
        </div>

        {groupedEntries.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              No responses found for the selected period.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Athletes will appear here once they submit their daily check-ins.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {groupedEntries.map((entry) => {
              const athleteKey = `${entry.athlete.id}-${entry.date}`;
              const isExpanded = expandedAthletes[athleteKey] || false;

              return (
                <div key={athleteKey}>
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      setExpandedAthletes((prev) => ({
                        ...prev,
                        [athleteKey]: !prev[athleteKey],
                      }))
                    }
                  >
                    {/* Athlete Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ProfilePicture profile={entry.athlete} size="md" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {entry.athlete.full_name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {formatDate(entry.date)}
                            <span className="mx-2">•</span>
                            <Clock className="w-4 h-4" />
                            {formatTime(entry.responses[0]?.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {entry.responses.length} metric
                          {entry.responses.length !== 1 ? "s" : ""}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-100">
                      {/* Responses Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {entry.responses.map((response) => (
                          <div
                            key={response.id}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            <div className="mb-3">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {response.metric.title}
                              </h4>
                              {response.metric.description && (
                                <p className="text-xs text-gray-500">
                                  {response.metric.description}
                                </p>
                              )}
                            </div>

                            {response.metric.type === "rating" ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={clsx(
                                      "px-3 py-1 rounded-full text-sm font-semibold",
                                      getRatingColor(response.rating_value || 0)
                                    )}
                                  >
                                    {response.rating_value}/5
                                  </div>
                                </div>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={clsx(
                                        "w-5 h-5",
                                        star <= (response.rating_value || 0)
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-sm text-gray-700">
                                  {response.text_value ||
                                    "No response provided"}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
