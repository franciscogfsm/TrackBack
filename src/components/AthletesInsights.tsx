import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";
import {
  generateAthleteInsights,
  generateTeamInsights,
  PerformanceData,
  Insight,
} from "../services/aiInsights";
import clsx from "clsx";

interface InsightsProps {
  athleteId?: string;
  teamId?: string;
  data: PerformanceData[] | { [athleteId: string]: PerformanceData[] };
}

export default function AthletesInsights({
  athleteId,
  teamId,
  data,
}: InsightsProps) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<string>(JSON.stringify(data));
  const fetchingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const currentDataString = JSON.stringify(data);

    const fetchInsights = async () => {
      // If already fetching, abort the previous request
      if (fetchingRef.current) {
        abortControllerRef.current?.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);
        fetchingRef.current = true;

        // Generate insights based on whether we're looking at team or individual data
        const response = athleteId
          ? await generateAthleteInsights(data as PerformanceData[])
          : await generateTeamInsights(
              data as { [athleteId: string]: PerformanceData[] }
            );

        // Only update state if the component is still mounted and this request wasn't aborted
        if (!abortControllerRef.current?.signal.aborted) {
          setInsights(response);
          dataRef.current = currentDataString;
        }
      } catch (err) {
        // Only update error state if the component is still mounted and this request wasn't aborted
        if (!abortControllerRef.current?.signal.aborted) {
          if (err instanceof Error) {
            if (err.message.includes("Rate limit")) {
              setError("Please wait a moment before requesting new insights.");
            } else {
              setError(err.message);
            }
          } else {
            setError("Failed to generate insights. Please try again later.");
          }
          console.error("Error fetching insights:", err);
        }
      } finally {
        // Only update loading state if the component is still mounted and this request wasn't aborted
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
          fetchingRef.current = false;
        }
      }
    };

    // Delay the fetch slightly to avoid React 18 double-mount issues
    const timeoutId = setTimeout(() => {
      if (!fetchingRef.current) {
        fetchInsights();
      }
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchingRef.current = false;
    };
  }, [athleteId, teamId, data]);

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
              AI Analysis in Progress
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></div>
              <p className="text-blue-200 text-sm">
                Analyzing performance patterns...
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
      <div className="bg-blue-600 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
              <span className="text-xs text-blue-200">
                Performance Insights
              </span>
            </div>
            <p className="text-sm text-white mt-2">
              Based on the recent training data, I notice a positive trend in
              recovery patterns. The athlete's response to high-intensity
              sessions has improved, suggesting good adaptation to the current
              training load. Consider gradually increasing training volume while
              maintaining the current intensity levels.
            </p>
          </div>
          <button className="text-white/80 hover:text-white ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={clsx(
            "p-6 bg-gradient-to-br backdrop-blur-xl rounded-xl border border-white/10 shadow-xl transition-all duration-500 hover:scale-[1.02]",
            index === 0
              ? "from-blue-900/50 to-cyan-900/50"
              : index === 1
              ? "from-purple-900/50 to-pink-900/50"
              : "from-indigo-900/50 to-violet-900/50"
          )}
          style={{
            animation: `fadeIn 600ms ${index * 150}ms both`,
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div
                className={clsx(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  index === 0
                    ? "bg-blue-500/20"
                    : index === 1
                    ? "bg-purple-500/20"
                    : "bg-indigo-500/20"
                )}
              >
                {index === 0 ? (
                  <TrendingUp className="w-7 h-7 text-blue-400" />
                ) : index === 1 ? (
                  <TrendingDown className="w-7 h-7 text-purple-400" />
                ) : (
                  <Brain className="w-7 h-7 text-indigo-400" />
                )}
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles
                  className={clsx(
                    "w-4 h-4",
                    index === 0
                      ? "text-blue-400"
                      : index === 1
                      ? "text-purple-400"
                      : "text-indigo-400"
                  )}
                />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{insight.area}</h3>
              <p
                className={clsx(
                  "text-sm mt-1",
                  index === 0
                    ? "text-blue-200"
                    : index === 1
                    ? "text-purple-200"
                    : "text-indigo-200"
                )}
              >
                {insight.trend}
              </p>
            </div>
          </div>
          <div
            className={clsx(
              "mt-4 p-4 rounded-lg bg-white/5 border border-white/5",
              "transform transition-all duration-300 hover:scale-[1.01] hover:bg-white/10"
            )}
          >
            <p className="text-white/90">{insight.recommendation}</p>
          </div>
        </div>
      ))}
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
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
