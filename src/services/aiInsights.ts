import OpenAI from "openai";

// Add debug logging for API key
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
console.log("API Key status:", apiKey ? "Present" : "Missing");

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

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 1; // Maximum 1 request per minute
const MIN_REQUEST_INTERVAL = 5000; // Minimum 5 seconds between requests

let requestTimestamps: number[] = [];
let lastRequestTime = 0;
let insightsCache = new Map<
  string,
  { insights: Insight[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting function
function checkRateLimit(): void {
  const now = Date.now();

  // Clean up old timestamps
  requestTimestamps = requestTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  );

  // Check minimum interval between requests
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
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
  notes?: string;
}

export interface Insight {
  area: string;
  trend: string;
  recommendation: string;
}

// Add fallback insights for when API calls fail
const FALLBACK_INSIGHTS: Insight[] = [
  {
    area: "Training Load",
    trend: "Based on recent metrics",
    recommendation:
      "Maintain current training intensity while monitoring recovery levels. Consider adjusting based on daily feedback.",
  },
  {
    area: "Recovery",
    trend: "Recovery patterns analysis",
    recommendation:
      "Focus on quality sleep and proper nutrition. Take rest days when needed to prevent overtraining.",
  },
  {
    area: "Performance",
    trend: "Overall performance indicators",
    recommendation:
      "Set specific goals for each training session. Track progress consistently and adjust training plans accordingly.",
  },
];

export async function generateAthleteInsights(
  data: PerformanceData[]
): Promise<Insight[]> {
  // Check if we have any historical data at all
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return [
      {
        area: "No Data",
        trend: "No performance data available",
        recommendation: "Please provide performance data for analysis.",
      },
    ];
  }

  const cacheKey = JSON.stringify(data);
  const cached = insightsCache.get(cacheKey);

  // Return cached insights if they exist and are not expired
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("Returning cached insights");
    return cached.insights;
  }

  try {
    checkRateLimit();

    console.log("Making OpenAI API request...");
    const prompt = `As an expert sports performance analyst, analyze this athlete's performance data chronologically, considering historical patterns and recent trends. Focus on:

1. Performance Progression: Compare recent performance with historical data
2. Recovery Patterns: Identify trends in recovery and rest periods
3. Training Response: Analyze how the athlete responds to different training intensities
4. Key Metrics Correlation: Find relationships between different performance metrics
5. Risk Factors: Identify any potential overtraining or injury risk patterns

Here's the performance data in chronological order:
${JSON.stringify(data, null, 2)}

Provide 3 detailed insights with clear trends and actionable recommendations. Format each insight as: area|trend|recommendation`;

    const response = await openai.chat.completions
      .create({
        model: "gpt-3.5-turbo",
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
      })
      .catch((error) => {
        console.error("OpenAI API Error:", error);
        if (error.status === 401) {
          throw new Error("Invalid API key. Please check your OpenAI API key.");
        } else if (error.status === 429) {
          // If we hit rate limits or quota limits, use fallback content
          console.log("Using fallback insights due to API limits");
          return {
            choices: [{ message: { content: generateFallbackContent(data) } }],
          };
        }
        throw error;
      });

    console.log("OpenAI API response received");
    const insights =
      response.choices[0].message.content
        ?.split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => {
          const [area, trend, recommendation] = line.split("|");
          return { area, trend, recommendation };
        }) || generateFallbackInsights(data);

    // Cache the results
    insightsCache.set(cacheKey, { insights, timestamp: Date.now() });
    return insights;
  } catch (error) {
    console.error("Error in generateAthleteInsights:", error);
    return generateFallbackInsights(data);
  }
}

// New function to generate more contextual fallback insights
function generateFallbackInsights(data: PerformanceData[]): Insight[] {
  // If we have data, try to provide more relevant fallback insights
  if (data && data.length > 0) {
    const metrics = Object.keys(data[0].metrics);
    const latestData = data[data.length - 1];
    const previousData = data.length > 1 ? data[data.length - 2] : null;

    return [
      {
        area: "Recent Performance",
        trend: `Analyzing data from ${new Date(
          latestData.date
        ).toLocaleDateString()}`,
        recommendation:
          "Continue monitoring and recording your performance metrics regularly for more detailed insights.",
      },
      {
        area: "Training Load",
        trend: "Historical data available for analysis",
        recommendation:
          "Maintain consistent training documentation to track progress effectively.",
      },
      {
        area: "Recovery Management",
        trend: "Tracking recovery patterns",
        recommendation:
          "Focus on balanced training and recovery cycles based on your historical performance.",
      },
    ];
  }

  // Return default insights if no data is available
  return FALLBACK_INSIGHTS;
}

// Helper function to generate fallback content based on actual data
function generateFallbackContent(data: PerformanceData[]): string {
  // If we have actual data, try to provide more relevant fallback insights
  if (data.length > 0 && data[0].metrics) {
    const metrics = Object.keys(data[0].metrics);
    return metrics
      .map((metric, index) => {
        if (index === 0)
          return `Training Management|Analyzing ${metric}|Focus on maintaining consistent ${metric.toLowerCase()} while monitoring your body's response.`;
        if (index === 1)
          return `Recovery|Tracking ${metric}|Pay attention to your ${metric.toLowerCase()} patterns and adjust training accordingly.`;
        return `Performance|Overall Progress|Set specific goals and track your progress consistently across all metrics.`;
      })
      .join("\n");
  }

  // If no data, return generic insights
  return `Training Load|Recent Analysis|Maintain balanced training intensity and monitor recovery.
Recovery|Pattern Analysis|Focus on quality sleep and proper nutrition between sessions.
Performance|Progress Tracking|Set specific goals and maintain consistent tracking.`;
}

export async function generateTeamInsights(data: {
  [athleteId: string]: PerformanceData[];
}): Promise<Insight[]> {
  const cacheKey = JSON.stringify(data);
  const cached = insightsCache.get(cacheKey);

  // Return cached insights if they exist and are not expired
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.insights;
  }

  try {
    checkRateLimit();

    const prompt = `Analyze this team's performance data and provide 3 key insights with trends and recommendations:
${JSON.stringify(data, null, 2)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
    });

    const insights =
      response.choices[0].message.content
        ?.split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => {
          const [area, trend, recommendation] = line.split("|");
          return { area, trend, recommendation };
        }) || [];

    // Cache the results
    insightsCache.set(cacheKey, { insights, timestamp: Date.now() });
    return insights;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        error.message.includes("Rate limit")
          ? error.message
          : "Failed to generate insights. Please try again later."
      );
    }
    throw error;
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
      insights: [{ area: metricName, trend: "", recommendation: analysis }],
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
