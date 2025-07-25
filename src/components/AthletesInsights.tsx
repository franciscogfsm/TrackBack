import { useState, useEffect, useRef } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Sparkles,
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
      <div className="relative p-8 bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-pulse"></div>
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-blue-400" />
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="animate-spin">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {athleteId
                ? "Comprehensive AI Analysis in Progress"
                : "AI Analysis in Progress"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></div>
              <p className="text-blue-200 text-sm">
                {athleteId
                  ? "Analyzing complete training history and patterns..."
                  : "Analyzing performance patterns..."}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-white/5 rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-900/50 to-orange-900/50 backdrop-blur-xl rounded-xl border border-red-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Analysis Error</h3>
            <p className="text-red-200 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
              <span className="text-xs text-blue-200">
                Performance Insights
              </span>
            </div>
            <p className="text-sm text-white/80 mt-2">
              No performance data available yet. Add some training metrics to
              get AI-powered insights and coaching recommendations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={clsx(
            "group p-6 bg-gradient-to-r backdrop-blur-xl rounded-xl border border-white/10 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-white/20",
            index === 0
              ? "from-blue-900/40 to-blue-800/40"
              : index === 1
              ? "from-purple-900/40 to-purple-800/40"
              : index === 2
              ? "from-indigo-900/40 to-indigo-800/40"
              : "from-emerald-900/40 to-emerald-800/40"
          )}
          style={{
            animation: `slideIn 500ms ${index * 100}ms both`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: Icon and Title */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div
                  className={clsx(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    index === 0
                      ? "bg-blue-500/20 text-blue-300"
                      : index === 1
                      ? "bg-purple-500/20 text-purple-300"
                      : index === 2
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  )}
                >
                  {index === 0 ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : index === 1 ? (
                    <TrendingDown className="w-6 h-6" />
                  ) : index === 2 ? (
                    <Brain className="w-6 h-6" />
                  ) : (
                    <Sparkles className="w-6 h-6" />
                  )}
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {insight.area}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                  <span className="text-xs text-white/60 uppercase tracking-wide">
                    Daily Planning Focus
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Confidence Badge */}
            {insight.confidence && (
              <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-xs font-medium text-white/80">
                  {Math.round(insight.confidence * 100)}% confident
                </span>
              </div>
            )}
          </div>

          {/* Main Content: Trend + Action */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Current Status */}
            <div className="bg-black/20 rounded-lg p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-white/50"></div>
                <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                  Current Status
                </h4>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                {insight.trend}
              </p>
            </div>

            {/* Action Plan */}
            <div
              className={clsx(
                "rounded-lg p-4 border",
                index === 0
                  ? "bg-blue-500/10 border-blue-400/20"
                  : index === 1
                  ? "bg-purple-500/10 border-purple-400/20"
                  : index === 2
                  ? "bg-indigo-500/10 border-indigo-400/20"
                  : "bg-emerald-500/10 border-emerald-400/20"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={clsx(
                    "w-2 h-2 rounded-full",
                    index === 0
                      ? "bg-blue-400"
                      : index === 1
                      ? "bg-purple-400"
                      : index === 2
                      ? "bg-indigo-400"
                      : "bg-emerald-400"
                  )}
                ></div>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Action Plan
                </h4>
              </div>
              <p className="text-white text-sm leading-relaxed font-medium">
                {insight.recommendation ||
                  "Continue current training approach and monitor progress closely. Schedule a check-in to discuss any concerns."}
              </p>
            </div>
          </div>

          {/* Quick Action Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {getActionTags(insight.area, insight.recommendation).map(
              (tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className={clsx(
                    "px-3 py-1 rounded-full text-xs font-medium border",
                    index === 0
                      ? "bg-blue-500/10 text-blue-200 border-blue-400/30"
                      : index === 1
                      ? "bg-purple-500/10 text-purple-200 border-purple-400/30"
                      : index === 2
                      ? "bg-indigo-500/10 text-indigo-200 border-indigo-400/30"
                      : "bg-emerald-500/10 text-emerald-200 border-emerald-400/30"
                  )}
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </div>
      ))}

      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
    </div>
  );
}

// Helper function to generate action tags based on the area and recommendation
function getActionTags(area: string, recommendation: string): string[] {
  const areaLower = area.toLowerCase();
  const recLower = recommendation.toLowerCase();

  const tags: string[] = [];

  // Performance-related tags
  if (areaLower.includes("performance") || areaLower.includes("trend")) {
    if (recLower.includes("monitor") || recLower.includes("track"))
      tags.push("📊 Monitor");
    if (recLower.includes("adjust") || recLower.includes("modify"))
      tags.push("⚙️ Adjust Training");
    if (recLower.includes("increase") || recLower.includes("progress"))
      tags.push("📈 Progress");
  }

  // Recovery-related tags
  if (areaLower.includes("recovery") || areaLower.includes("wellness")) {
    if (recLower.includes("rest") || recLower.includes("sleep"))
      tags.push("😴 Rest Focus");
    if (recLower.includes("recovery") || recLower.includes("restore"))
      tags.push("🔄 Recovery");
    if (recLower.includes("stress") || recLower.includes("manage"))
      tags.push("🧘 Stress Management");
  }

  // Training-related tags
  if (areaLower.includes("training") || areaLower.includes("load")) {
    if (recLower.includes("reduce") || recLower.includes("decrease"))
      tags.push("⬇️ Reduce Load");
    if (recLower.includes("intensity") || recLower.includes("volume"))
      tags.push("💪 Intensity Check");
    if (recLower.includes("schedule") || recLower.includes("plan"))
      tags.push("📅 Schedule Review");
  }

  // General coaching tags
  if (recLower.includes("discuss") || recLower.includes("communicate"))
    tags.push("💬 Athlete Check-in");
  if (recLower.includes("consistent") || recLower.includes("routine"))
    tags.push("🎯 Consistency");
  if (recLower.includes("immediate") || recLower.includes("urgent"))
    tags.push("⚡ Immediate Action");

  // Default tags if none found
  if (tags.length === 0) {
    tags.push("📋 Daily Review", "🎯 Action Required");
  }

  return tags.slice(0, 3); // Limit to 3 tags max
}
