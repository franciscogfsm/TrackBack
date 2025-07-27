import { useState, useEffect, useRef } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Sparkles,
  Target,
  Activity,
  MessageCircle,
  BarChart3,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  generateTeamInsights,
  generateComprehensiveAthleteInsights,
  fetchComprehensiveAthleteData,
  PerformanceData,
  Insight,
} from "../services/aiInsights";
import clsx from "clsx";

// Global cache for component-level insights to persist across re-renders
const componentInsightsCache = new Map<string, Insight[]>();

interface InsightsProps {
  athleteId?: string;
  teamId?: string;
  data: PerformanceData[] | { [athleteId: string]: PerformanceData[] };
  model?: string;
}

export default function AthletesInsights({
  athleteId,
  teamId,
  data,
  model = "gpt-3.5-turbo",
}: InsightsProps) {
  // Check for cached insights first
  const cacheKey = `${athleteId || teamId}_${JSON.stringify(data)}_${model}`;
  const cachedInsights = componentInsightsCache.get(cacheKey);

  const [insights, setInsights] = useState<Insight[] | null>(
    cachedInsights || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<string>(JSON.stringify(data));
  const fetchingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasInitialized = useRef<boolean>(!!cachedInsights);

  useEffect(() => {
    const currentDataString = JSON.stringify(data);

    const fetchInsights = async () => {
      if (fetchingRef.current) {
        abortControllerRef.current?.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);
        fetchingRef.current = true;

        // For individual athletes, use comprehensive data fetching
        if (athleteId) {
          console.log("🔍 Starting insights for athlete:", athleteId);

          // Fetch comprehensive data from database
          const comprehensiveData = await fetchComprehensiveAthleteData(
            athleteId
          );

          console.log("📊 Comprehensive data received:", comprehensiveData);

          if (!comprehensiveData) {
            throw new Error("Could not fetch athlete data from database");
          }

          console.log("🤖 Generating AI insights...");

          // Generate insights using comprehensive data
          const response = await generateComprehensiveAthleteInsights(
            comprehensiveData,
            model
          );

          console.log("✅ AI insights received:", response);

          if (!abortControllerRef.current?.signal.aborted) {
            setInsights(response);
            setError(null); // Clear any previous errors
            // Cache the insights at component level
            componentInsightsCache.set(cacheKey, response);
            dataRef.current = currentDataString;
          }
        } else {
          // For team insights, use legacy approach
          const processedData = Object.entries(
            data as { [athleteId: string]: PerformanceData[] }
          ).reduce(
            (acc, [id, athleteData]) => ({
              ...acc,
              [id]: athleteData,
            }),
            {} as { [athleteId: string]: PerformanceData[] }
          );

          const response = await generateTeamInsights(processedData, model);

          if (!abortControllerRef.current?.signal.aborted) {
            setInsights(response);
            // Cache the insights at component level
            componentInsightsCache.set(cacheKey, response);
            dataRef.current = currentDataString;
          }
        }
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          if (err instanceof Error) {
            if (
              err.message.includes("Rate limit") ||
              err.message.includes("wait")
            ) {
              setError(
                "Please wait a moment before requesting new insights. The AI needs time between requests."
              );
            } else {
              setError(err.message);
            }
          } else {
            setError("Failed to generate insights. Please try again later.");
          }
          console.error("Error fetching insights:", err);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
          fetchingRef.current = false;
        }
      }
    };

    // Only fetch if the data has changed, we don't have insights yet, and we're not already fetching
    if (
      (currentDataString !== dataRef.current ||
        (!insights && !hasInitialized.current)) &&
      !fetchingRef.current
    ) {
      hasInitialized.current = true;
      const timeoutId = setTimeout(() => {
        if (!fetchingRef.current) {
          fetchInsights();
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        fetchingRef.current = false;
      };
    }
  }, [athleteId, teamId, data, model]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="animate-spin">
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {athleteId
                ? "Comprehensive AI Analysis in Progress"
                : "AI Analysis in Progress"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></div>
              <p className="text-sm text-gray-600">
                {athleteId
                  ? "Analyzing complete training history and patterns..."
                  : "Analyzing performance patterns..."}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-blue-50 rounded-lg animate-pulse border border-blue-100"
              style={{ animationDelay: `${i * 150}ms` }}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center border border-red-200">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Analysis Error
            </h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                AI Assistant
              </h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                Performance Insights
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              No performance data available yet. Add some training metrics to
              get AI-powered insights and coaching recommendations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Summary Header */}
      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                AI Coaching Insights
              </h2>
              <p className="text-sm text-gray-600">
                Data-driven recommendations for optimal performance
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {insights.length}
            </div>
            <div className="text-xs text-blue-500 uppercase tracking-wide font-medium">
              Action Items
            </div>
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {insights.map((insight, index) => {
          const isUrgent =
            insight.area.includes("🚨") ||
            insight.recommendation.includes("IMMEDIATE") ||
            insight.recommendation.includes("URGENT");
          const isPositive =
            insight.trend.includes("EXCELLENT") ||
            insight.trend.includes("GOOD") ||
            insight.recommendation.includes("excellent");

          return (
            <div
              key={index}
              className={clsx(
                "group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg",
                isUrgent
                  ? "bg-red-50 border-red-200"
                  : isPositive
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-white border-blue-200",
                "shadow-sm"
              )}
              style={{
                animation: `slideInUp 600ms ${index * 150}ms both`,
              }}
            >
              {/* Urgency Indicator */}
              {isUrgent && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <AlertTriangle className="w-3 h-3" />
                    URGENT
                  </div>
                </div>
              )}

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className={clsx(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border",
                      isUrgent
                        ? "bg-red-100 border-red-200"
                        : isPositive
                        ? "bg-emerald-100 border-emerald-200"
                        : index === 0
                        ? "bg-blue-100 border-blue-200"
                        : index === 1
                        ? "bg-purple-100 border-purple-200"
                        : index === 2
                        ? "bg-indigo-100 border-indigo-200"
                        : "bg-teal-100 border-teal-200"
                    )}
                  >
                    {getInsightIcon(insight.area, isUrgent, isPositive)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                      {insight.area.replace(/[🚨💪🎯📊📈🔄🧘⚡💬]/g, "").trim()}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {insight.confidence && (
                          <>
                            <div
                              className={clsx(
                                "w-2 h-2 rounded-full",
                                insight.confidence >= 0.8
                                  ? "bg-green-500"
                                  : insight.confidence >= 0.6
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              )}
                            ></div>
                            <span className="text-xs text-gray-500">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Status */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                      Current Analysis
                    </h4>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-gray-900 text-sm leading-relaxed">
                      {formatTrendText(insight.trend)}
                    </p>
                  </div>
                </div>

                {/* Action Plan */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                      Recommended Actions
                    </h4>
                  </div>
                  <div
                    className={clsx(
                      "rounded-lg p-4 border",
                      isUrgent
                        ? "bg-red-50 border-red-200"
                        : isPositive
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-blue-50 border-blue-200"
                    )}
                  >
                    <p className="text-gray-900 text-sm leading-relaxed font-medium">
                      {formatRecommendationText(
                        insight.recommendation ||
                          "Continue current training approach and monitor progress closely. Schedule a check-in to discuss any concerns."
                      )}
                    </p>
                  </div>
                </div>

                {/* Action Tags */}
                <div className="flex flex-wrap gap-2">
                  {getEnhancedActionTags(
                    insight.area,
                    insight.recommendation,
                    isUrgent
                  ).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className={clsx(
                        "px-3 py-1 rounded-full text-xs font-medium border",
                        isUrgent
                          ? "bg-red-100 text-red-700 border-red-200"
                          : isPositive
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-blue-100 text-blue-700 border-blue-200"
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>
        {`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}

// Enhanced helper functions for better UI
function getInsightIcon(area: string, isUrgent: boolean, isPositive: boolean) {
  const iconClass = clsx(
    "w-6 h-6",
    isUrgent
      ? "text-red-600"
      : isPositive
      ? "text-emerald-600"
      : "text-blue-600"
  );

  if (area.includes("Risk") || area.includes("🚨"))
    return <AlertTriangle className={iconClass} />;
  if (area.includes("Communication") || area.includes("💬"))
    return <MessageCircle className={iconClass} />;
  if (area.includes("Training") || area.includes("💪"))
    return <Activity className={iconClass} />;
  if (area.includes("Monitoring") || area.includes("📊"))
    return <BarChart3 className={iconClass} />;
  if (isPositive) return <CheckCircle className={iconClass} />;
  return <Target className={iconClass} />;
}

function formatTrendText(trend: string): string {
  // Highlight key numbers and risk indicators
  return trend
    .replace(/(\d+\.?\d*\/5\.0)/g, "**$1**")
    .replace(/(CRITICAL|HIGH RISK|EXCELLENT|GOOD)/g, "**$1**")
    .replace(/([↗️↘️→])/g, " $1 ");
}

function formatRecommendationText(recommendation: string): string {
  // Highlight action words and timeframes
  return recommendation
    .replace(/(IMMEDIATE|URGENT|TODAY|THIS WEEK)/g, "**$1**")
    .replace(/(\d+%|\d+-\d+%)/g, "**$1**")
    .replace(/(Schedule|Reduce|Increase|Monitor|Discuss)/g, "**$1**");
}

function getEnhancedActionTags(
  area: string,
  recommendation: string,
  isUrgent: boolean
): string[] {
  const areaLower = area.toLowerCase();
  const recLower = recommendation.toLowerCase();
  const tags: string[] = [];

  // Urgency tags
  if (
    isUrgent ||
    recLower.includes("immediate") ||
    recLower.includes("urgent")
  ) {
    tags.push("🚨 Immediate Action");
  }

  // Specific action tags based on content
  if (recLower.includes("meeting") || recLower.includes("discuss"))
    tags.push("💬 Schedule Meeting");
  if (recLower.includes("reduce") && recLower.includes("load"))
    tags.push("⬇️ Reduce Load");
  if (recLower.includes("monitor") || recLower.includes("track"))
    tags.push("📊 Monitor Closely");
  if (recLower.includes("deload") || recLower.includes("rest"))
    tags.push("😴 Recovery Focus");
  if (recLower.includes("increase") || recLower.includes("progress"))
    tags.push("📈 Progress Plan");
  if (recLower.includes("data") || recLower.includes("collect"))
    tags.push("📋 Data Collection");

  // Area-specific tags
  if (areaLower.includes("risk")) tags.push("⚠️ Risk Management");
  if (areaLower.includes("communication")) tags.push("🗣️ Communication");
  if (areaLower.includes("training")) tags.push("🏋️ Training Adjustment");
  if (areaLower.includes("monitoring")) tags.push("📈 Tracking");

  // Default tags if none found
  if (tags.length === 0) {
    tags.push("📋 Review Required", "🎯 Action Needed");
  }

  return tags.slice(0, 4); // Limit to 4 tags max
}
