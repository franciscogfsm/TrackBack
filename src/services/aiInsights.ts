import OpenAI from "openai";
import { supabase } from "../lib/supabase";

// Add debug logging for API key
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
console.log(
  "API Key status:",
  apiKey ? `Present (${apiKey.substring(0, 10)}...)` : "Missing"
);
console.log("API Key length:", apiKey ? apiKey.length : 0);

if (!apiKey) {
  throw new Error(
    "OpenAI API key is not defined. Please add VITE_OPENAI_API_KEY to your .env file"
  );
}

// Initialize OpenAI client with better error handling
let openai: OpenAI;
try {
  openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
  throw new Error(
    "Failed to initialize OpenAI client. Please check your API key."
  );
}

// Rate limiting configuration - Updated to 10 requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 10; // Maximum 10 requests per minute
const MIN_REQUEST_INTERVAL = 6000; // Minimum 6 seconds between requests

let requestTimestamps: number[] = [];
let lastRequestTime = 0;
let insightsCache = new Map<
  string,
  { insights: Insight[]; timestamp: number }
>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 5 minutes)

// Enhanced interfaces for comprehensive athlete data
export interface AthleteMetricResponse {
  id: number;
  created_at: string;
  metric_title: string;
  metric_type: "rating" | "text";
  metric_description?: string;
  rating_value?: number;
  text_value?: string;
}

export interface ComprehensiveAthleteData {
  athlete: {
    id: string;
    name: string;
    email: string;
    created_at: string;
  };
  totalResponses: number;
  dateRange: {
    start: string;
    end: string;
    totalDays: number;
  };
  metrics: {
    [metricName: string]: {
      type: "rating" | "text";
      description?: string;
      values: Array<{
        date: string;
        value: number | string;
      }>;
      averageRating?: number;
      trend?: "improving" | "declining" | "stable";
    };
  };
  recentEntries: AthleteMetricResponse[];
  consistencyScore: number; // 0-100 based on response frequency
}

// Rate limiting function
function checkRateLimit(): void {
  const now = Date.now();

  // Clean up old timestamps
  requestTimestamps = requestTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  );

  // Check minimum interval between requests (skip check for first request)
  if (lastRequestTime > 0 && now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - (now - lastRequestTime);
    throw new Error(
      `Please wait ${Math.ceil(waitTime / 1000)} seconds between requests.`
    );
  }

  // Check rate limit
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestRequest = requestTimestamps[0];
    const timeToWait = RATE_LIMIT_WINDOW - (now - oldestRequest);
    throw new Error(
      `Rate limit exceeded. Please wait ${Math.ceil(
        timeToWait / 1000
      )} seconds before trying again.`
    );
  }

  lastRequestTime = now;
  requestTimestamps.push(now);
}

// Clear cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of insightsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      insightsCache.delete(key);
    }
  }
}, CACHE_DURATION);

export interface PerformanceData {
  date: string;
  metrics: {
    [key: string]: number;
  };
  notes: string;
}

export interface Insight {
  area: string;
  trend: string;
  recommendation: string;
  confidence: number;
  supportingData?: {
    metrics: string[];
    dateRange: string;
    trendValues: number[];
  };
}

// Function to fetch comprehensive athlete data from database
export async function fetchComprehensiveAthleteData(
  athleteId: string
): Promise<ComprehensiveAthleteData | null> {
  console.log("📥 Fetching comprehensive data for athlete:", athleteId);

  try {
    // Fetch athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("id", athleteId)
      .single();

    if (athleteError) {
      console.error("❌ Error fetching athlete:", athleteError);
      return null;
    }

    console.log("👤 Athlete found:", athlete.full_name);

    // Fetch all metric responses for the athlete
    const { data: responses, error: responsesError } = await supabase
      .from("metric_responses")
      .select(
        `
        id,
        created_at,
        rating_value,
        text_value,
        custom_metrics!inner(
          id,
          title,
          type,
          description
        )
      `
      )
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });

    if (responsesError) {
      console.error("❌ Error fetching responses:", responsesError);
      return null;
    }

    console.log("📊 Responses found:", responses?.length || 0);

    if (!responses || responses.length === 0) {
      console.log("⚠️ No responses found for athlete");
      return {
        athlete: {
          id: athlete.id,
          name: athlete.full_name,
          email: athlete.email,
          created_at: athlete.created_at,
        },
        totalResponses: 0,
        dateRange: {
          start: new Date().toISOString().split("T")[0],
          end: new Date().toISOString().split("T")[0],
          totalDays: 0,
        },
        metrics: {},
        recentEntries: [],
        consistencyScore: 0,
      };
    }

    // Process the responses
    const processedResponses: AthleteMetricResponse[] = responses.map(
      (r: any) => ({
        id: r.id,
        created_at: r.created_at,
        metric_title: r.custom_metrics.title,
        metric_type: r.custom_metrics.type,
        metric_description: r.custom_metrics.description,
        rating_value: r.rating_value,
        text_value: r.text_value,
      })
    );

    // Calculate date range
    const dates = processedResponses.map((r) => new Date(r.created_at));
    const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const totalDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    // Group by metrics and calculate trends
    const metricsData: { [metricName: string]: any } = {};

    processedResponses.forEach((response) => {
      const metricName = response.metric_title;

      if (!metricsData[metricName]) {
        metricsData[metricName] = {
          type: response.metric_type,
          description: response.metric_description,
          values: [],
          averageRating: undefined,
          trend: "stable" as const,
        };
      }

      const value =
        response.metric_type === "rating"
          ? response.rating_value
          : response.text_value;

      if (value !== null && value !== undefined) {
        metricsData[metricName].values.push({
          date: response.created_at.split("T")[0],
          value: value,
        });
      }
    });

    // Calculate averages and trends for rating metrics
    Object.keys(metricsData).forEach((metricName) => {
      const metric = metricsData[metricName];
      if (metric.type === "rating") {
        const ratingValues = metric.values
          .map((v: any) => v.value)
          .filter((v: any) => typeof v === "number");

        if (ratingValues.length > 0) {
          metric.averageRating =
            ratingValues.reduce((sum: number, val: number) => sum + val, 0) /
            ratingValues.length;

          // Calculate trend (comparing first half vs second half)
          if (ratingValues.length >= 4) {
            const midPoint = Math.floor(ratingValues.length / 2);
            const firstHalf = ratingValues.slice(0, midPoint);
            const secondHalf = ratingValues.slice(midPoint);

            const firstAvg =
              firstHalf.reduce((sum: number, val: number) => sum + val, 0) /
              firstHalf.length;
            const secondAvg =
              secondHalf.reduce((sum: number, val: number) => sum + val, 0) /
              secondHalf.length;

            if (secondAvg > firstAvg + 0.3) {
              metric.trend = "improving";
            } else if (secondAvg < firstAvg - 0.3) {
              metric.trend = "declining";
            } else {
              metric.trend = "stable";
            }
          }
        }
      }
    });

    // Calculate consistency score
    const expectedResponses = totalDays; // Assuming daily responses are expected
    const actualResponses = processedResponses.length;
    const consistencyScore = Math.min(
      100,
      Math.round((actualResponses / expectedResponses) * 100)
    );

    return {
      athlete: {
        id: athlete.id,
        name: athlete.full_name,
        email: athlete.email,
        created_at: athlete.created_at,
      },
      totalResponses: processedResponses.length,
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        totalDays,
      },
      metrics: metricsData,
      recentEntries: processedResponses.slice(0, 10), // Last 10 entries
      consistencyScore,
    };
  } catch (error) {
    console.error("Error fetching comprehensive athlete data:", error);
    return null;
  }
}

// Enhanced AI insights function with comprehensive data analysis
export async function generateComprehensiveAthleteInsights(
  comprehensiveData: ComprehensiveAthleteData,
  model: string = "gpt-3.5-turbo"
): Promise<Insight[]> {
  console.log(
    "🔍 Starting comprehensive insights generation for:",
    comprehensiveData.athlete.name
  );
  console.log("📊 Data summary:", {
    totalResponses: comprehensiveData.totalResponses,
    dateRange: comprehensiveData.dateRange,
    metricsCount: Object.keys(comprehensiveData.metrics).length,
  });

  try {
    // Create a cache key based on the comprehensive data
    const cacheKey = `comprehensive_${comprehensiveData.athlete.id}_${comprehensiveData.totalResponses}_${model}`;
    console.log("🔑 Cache key:", cacheKey);

    const cached = insightsCache.get(cacheKey);
    console.log("📋 Cache status:", cached ? "Found" : "Not found");
    console.log("📋 Cache size:", insightsCache.size);

    // Return cached insights if they exist and are not expired
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(
        "✅ Using cached insights - valid for",
        Math.round((cached.timestamp + CACHE_DURATION - Date.now()) / 1000),
        "more seconds"
      );
      return cached.insights;
    } else if (cached) {
      console.log("⚠️ Cache expired, fetching new insights");
      insightsCache.delete(cacheKey);
    }

    console.log("⏱️ Checking rate limit...");
    checkRateLimit();
    console.log("✅ Rate limit check passed");

    // Create a detailed analysis prompt focused on coaching actionability
    const prompt = `You are an elite sports performance coach analyzing athlete data. Provide SPECIFIC, ACTIONABLE insights based on this comprehensive data.

ATHLETE PROFILE:
- Name: ${comprehensiveData.athlete.name}
- Period: ${comprehensiveData.dateRange.start} to ${
      comprehensiveData.dateRange.end
    } (${comprehensiveData.dateRange.totalDays} days)
- Total Responses: ${comprehensiveData.totalResponses}
- Response Consistency: ${comprehensiveData.consistencyScore}%

DETAILED METRICS BREAKDOWN:
${Object.entries(comprehensiveData.metrics)
  .map(([metricName, data]) => {
    if (data.type === "rating") {
      const recent = data.values.slice(0, 7);
      const older = data.values.slice(7, 14);
      const recentAvg =
        recent.length > 0
          ? recent.reduce((sum, v) => sum + (v.value as number), 0) /
            recent.length
          : 0;
      const olderAvg =
        older.length > 0
          ? older.reduce((sum, v) => sum + (v.value as number), 0) /
            older.length
          : 0;
      const trendDirection =
        recentAvg > olderAvg
          ? "↗️ IMPROVING"
          : recentAvg < olderAvg
          ? "↘️ DECLINING"
          : "→ STABLE";

      return `
📊 ${metricName}:
- Current Avg: ${data.averageRating?.toFixed(1)}/5.0 (${getTrendLabel(
        data.averageRating || 0
      )})
- 7-Day Trend: ${trendDirection} (${recentAvg.toFixed(1)} vs ${olderAvg.toFixed(
        1
      )})
- Pattern: ${data.trend.toUpperCase()}
- Last 5 values: [${recent
        .slice(0, 5)
        .map((v) => v.value)
        .join(", ")}]
- Risk Level: ${getRiskLevel(data.averageRating || 0, data.trend)}`;
    } else {
      return `
💭 ${metricName}:
- Type: Qualitative feedback
- Recent entries: ${data.values
        .slice(0, 3)
        .map((v) => `"${v.value}"`)
        .join(" | ")}
- Total responses: ${data.values.length}`;
    }
  })
  .join("\n")}

CRITICAL ANALYSIS REQUIREMENTS:
1. Identify SPECIFIC performance risks or opportunities
2. Provide IMMEDIATE actionable steps (today/this week)
3. Give clear metrics to monitor
4. Suggest conversation topics for athlete meetings
5. Include training load adjustments if needed

Format EXACTLY as:
AREA|SPECIFIC_TREND_WITH_DATA|IMMEDIATE_ACTION_PLAN

Provide exactly 4 insights covering:
1. Performance Risk Assessment
2. Recovery & Readiness Status  
3. Training Load Optimization
4. Athlete Communication Plan

Each insight must include specific numbers, timeframes, and actionable steps.`;

    console.log("🚀 Making enhanced OpenAI API call...");
    console.log(
      "📝 Enhanced prompt preview:",
      prompt.substring(0, 300) + "..."
    );

    let response;
    try {
      response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are an elite sports performance coach with 20+ years experience. Analyze athlete data with laser focus on:
            - IMMEDIATE performance risks (injury, overtraining, motivation drops)
            - SPECIFIC coaching actions (reduce load by X%, schedule meeting, adjust intensity)
            - MEASURABLE outcomes (target metrics, timelines, success indicators)
            
            Always include specific numbers from the data and concrete next steps. Format: AREA|TREND_WITH_DATA|ACTION_WITH_SPECIFICS`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more focused, consistent responses
        max_tokens: 1200, // Increased for detailed responses
      });
      console.log("✅ OpenAI API call successful");
    } catch (apiError) {
      console.error("❌ OpenAI API Error:", apiError);
      throw apiError;
    }
    console.log("📄 Raw response:", response.choices[0].message.content);

    const rawContent = response.choices[0].message.content;
    if (!rawContent) {
      console.log("⚠️ Empty response from OpenAI");
      return generateFallbackInsights(comprehensiveData);
    }

    const insights =
      rawContent
        ?.split("\n")
        .filter((line: string) => line.trim() && line.includes("|"))
        .map((line: string) => {
          console.log("🔍 Processing line:", line);
          const parts = line.split("|");

          if (parts.length >= 3) {
            const [area, trend, ...recommendationParts] = parts;
            const recommendation = recommendationParts.join("|"); // In case recommendation contains |

            const insight = {
              area: area?.trim() || "General Analysis",
              trend: trend?.trim() || "Analysis in progress",
              recommendation:
                recommendation?.trim() ||
                "Continue monitoring and maintain current approach",
              confidence: 0.8,
            };

            console.log("✅ Parsed insight:", insight);
            return insight;
          } else {
            console.log("⚠️ Invalid format, skipping line:", line);
            return null;
          }
        })
        .filter((insight): insight is Insight => insight !== null) ||
      generateFallbackInsights(comprehensiveData);

    console.log("🎯 Parsed insights:", insights);

    // If no valid insights were parsed, use fallback
    if (!insights || insights.length === 0) {
      console.log("⚠️ No valid insights parsed, using fallback");
      return generateFallbackInsights(comprehensiveData);
    }

    // Cache the results
    insightsCache.set(cacheKey, {
      insights,
      timestamp: Date.now(),
    });

    return insights;
  } catch (error) {
    console.error("❌ Error generating comprehensive insights:", error);
    console.error("🔄 Falling back to default insights");
    return generateFallbackInsights(comprehensiveData);
  }
}

// Legacy function for backward compatibility
export async function generateAthleteInsights(
  data: PerformanceData[],
  model: string = "gpt-3.5-turbo"
): Promise<Insight[]> {
  try {
    // Create a cache key based on the data and model
    const cacheKey = `athlete_${JSON.stringify(data)}_${model}`;
    const cached = insightsCache.get(cacheKey);

    // Return cached insights if they exist and are not expired
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.insights;
    }

    checkRateLimit();

    const prompt = `As an expert sports performance analyst, analyze this athlete's performance data chronologically, considering historical patterns and recent trends. Focus on:

1. Performance Progression: Compare recent performance with historical data
2. Recovery Patterns: Identify trends in recovery and rest periods
3. Training Response: Analyze how the athlete responds to different training intensities
4. Key Metrics Correlation: Find relationships between different performance metrics
5. Risk Factors: Identify any potential overtraining or injury risk patterns

Here's the performance data in chronological order:
${JSON.stringify(data, null, 2)}

Provide 3 detailed insights with clear trends and actionable recommendations. Format each insight as: area|trend|recommendation`;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert sports performance analyst. Analyze the data chronologically and provide comprehensive insights that consider historical patterns and recent trends. Format: area|trend|recommendation",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const insights =
      response.choices[0].message.content
        ?.split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => {
          const [area, trend, recommendation] = line.split("|");
          return {
            area: area?.trim() || "",
            trend: trend?.trim() || "",
            recommendation: recommendation?.trim() || "",
            confidence: 0.7,
          };
        }) || generateFallbackInsights(data);

    // Cache the results
    insightsCache.set(cacheKey, {
      insights,
      timestamp: Date.now(),
    });

    return insights;
  } catch (error) {
    console.error("Error generating insights:", error);
    return generateFallbackInsights(data);
  }
}

// Enhanced helper functions for better analysis
function getTrendLabel(average: number): string {
  if (average >= 4.0) return "EXCELLENT";
  if (average >= 3.5) return "GOOD";
  if (average >= 2.5) return "MODERATE";
  if (average >= 2.0) return "CONCERNING";
  return "CRITICAL";
}

function getRiskLevel(average: number, trend: string): string {
  if (average <= 2.0) return "🔴 HIGH RISK";
  if (average <= 2.5 && trend === "declining") return "🟡 MODERATE RISK";
  if (trend === "declining") return "🟡 MONITOR CLOSELY";
  return "🟢 LOW RISK";
}

// Generate fallback insights when API calls fail
function generateFallbackInsights(data: any): Insight[] {
  const isComprehensive = data && data.athlete;

  if (isComprehensive) {
    const comprehensiveData = data as ComprehensiveAthleteData;

    // Analyze the actual data to provide meaningful fallbacks
    const metrics = Object.entries(comprehensiveData.metrics);
    const ratingMetrics = metrics.filter(([_, data]) => data.type === "rating");

    // Calculate overall risk assessment
    const avgRatings = ratingMetrics.map(
      ([_, data]) => data.averageRating || 0
    );
    const overallAvg =
      avgRatings.length > 0
        ? avgRatings.reduce((sum, val) => sum + val, 0) / avgRatings.length
        : 3;
    const criticalMetrics = ratingMetrics.filter(
      ([_, data]) => (data.averageRating || 0) <= 2.5
    );

    return [
      {
        area: "🚨 Performance Risk Assessment",
        trend: `Overall average: ${overallAvg.toFixed(1)}/5.0. ${
          criticalMetrics.length > 0
            ? `CRITICAL: ${criticalMetrics.length} metrics below 2.5`
            : "Performance within acceptable range"
        }. Response consistency: ${comprehensiveData.consistencyScore}%`,
        recommendation:
          criticalMetrics.length > 0
            ? `IMMEDIATE ACTION: Schedule urgent meeting to discuss ${criticalMetrics
                .map(([name]) => name)
                .join(", ")}. Reduce training load by 20-30% this week.`
            : `Continue monitoring. Schedule weekly check-in. Maintain current training load with emphasis on consistency.`,
        confidence: 0.9,
      },
      {
        area: "💪 Training Load Optimization",
        trend: `${ratingMetrics.length} metrics tracked over ${
          comprehensiveData.dateRange.totalDays
        } days. ${
          comprehensiveData.consistencyScore < 70
            ? "Inconsistent reporting may indicate stress/motivation issues"
            : "Good tracking consistency shows engagement"
        }`,
        recommendation:
          comprehensiveData.consistencyScore < 70
            ? `Focus on motivation and barriers to tracking. Simplify daily reporting. Consider deload week.`
            : `Current tracking excellent. Consider adding specific performance metrics. Plan progressive overload for next phase.`,
        confidence: 0.8,
      },
      {
        area: "🎯 Athlete Communication Plan",
        trend: `${comprehensiveData.totalResponses} total responses indicate ${
          comprehensiveData.totalResponses > 20
            ? "good engagement"
            : "limited data availability"
        }. Last response: ${
          comprehensiveData.recentEntries[0]?.created_at.split("T")[0] ||
          "Unknown"
        }`,
        recommendation:
          comprehensiveData.totalResponses > 20
            ? `Schedule performance review meeting. Discuss trends and goal adjustments. Celebrate consistency in tracking.`
            : `PRIORITY: Improve data collection frequency. Set up automated reminders. Address barriers to daily reporting.`,
        confidence: 0.8,
      },
      {
        area: "📊 Monitoring Strategy",
        trend: `Current metrics: ${ratingMetrics
          .map(([name]) => name)
          .join(", ")}. Data span: ${
          comprehensiveData.dateRange.totalDays
        } days`,
        recommendation: `Continue tracking current metrics. ${
          ratingMetrics.length < 3
            ? "Consider adding sleep quality and training RPE metrics."
            : "Good metric coverage."
        } Set weekly review schedule.`,
        confidence: 0.7,
      },
    ];
  }

  // Enhanced fallback for legacy data structure
  return [
    {
      area: "📊 Data Collection Priority",
      trend: "Limited performance data available for comprehensive analysis",
      recommendation:
        "Implement daily tracking system with key metrics: sleep quality, energy levels, motivation, and training load perception",
      confidence: 0.6,
    },
    {
      area: "🎯 Initial Assessment Protocol",
      trend: "Baseline data collection needed for meaningful insights",
      recommendation:
        "Establish 2-week baseline period with consistent daily metrics. Focus on simple 1-5 scale ratings for key indicators",
      confidence: 0.7,
    },
    {
      area: "💬 Athlete Engagement",
      trend:
        "Insufficient data suggests potential engagement or system usability issues",
      recommendation:
        "Meet with athlete to discuss tracking system. Identify barriers and simplify data collection process",
      confidence: 0.8,
    },
  ];
}

export async function generateTeamInsights(
  data: { [athleteId: string]: PerformanceData[] },
  model: string = "gpt-3.5-turbo"
): Promise<Insight[]> {
  try {
    // Create a cache key based on the data and model
    const cacheKey = `team_${JSON.stringify(data)}_${model}`;
    const cached = insightsCache.get(cacheKey);

    // Return cached insights if they exist and are not expired
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.insights;
    }

    checkRateLimit();

    const prompt = `Analyze this team's performance data and provide 3 key insights with trends and recommendations:
${JSON.stringify(data, null, 2)}
Format each insight as: area|trend|recommendation`;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert sports team performance analyst. Analyze the data and provide insights in this format: area|trend|recommendation",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const insights =
      response.choices[0].message.content
        ?.split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => {
          const [area, trend, recommendation] = line.split("|");
          return {
            area: area?.trim() || "",
            trend: trend?.trim() || "",
            recommendation: recommendation?.trim() || "",
            confidence: 0.7,
          };
        }) || [];

    // Cache the results
    insightsCache.set(cacheKey, {
      insights,
      timestamp: Date.now(),
    });

    return insights;
  } catch (error) {
    console.error("Error generating insights:", error);
    return [
      {
        area: "Team Performance",
        trend: "Unable to analyze team data at this time.",
        recommendation: "Please try again later or check data availability.",
        confidence: 0.5,
      },
    ];
  }
}

// Function to analyze specific metrics
export async function analyzeMetric(
  metricData: { value: number; timestamp: Date }[],
  metricName: string
): Promise<string> {
  const cacheKey = `metric_${metricName}_${JSON.stringify(metricData)}`;
  const cached = insightsCache.get(cacheKey);

  // Return cached insights if they exist and are not expired
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.insights[0].recommendation;
  }

  try {
    checkRateLimit();

    const formattedData = JSON.stringify(metricData);
    const prompt = `
      Analyze this ${metricName} data and provide specific insights:
      ${formattedData}
      
      Focus on:
      1. Trends over time
      2. Notable improvements or declines
      3. Specific recommendations
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    const analysis = completion.choices[0].message.content || "";

    // Cache the results
    insightsCache.set(cacheKey, {
      insights: [
        {
          area: metricName,
          trend: "",
          recommendation: analysis,
          confidence: 0.7,
        },
      ],
      timestamp: Date.now(),
    });

    return analysis;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        error.message.includes("Rate limit")
          ? error.message
          : `Failed to analyze ${metricName}`
      );
    }
    throw error;
  }
}
