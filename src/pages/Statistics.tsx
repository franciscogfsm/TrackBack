import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type {
  Profile,
  CustomMetric,
  MetricResponse,
  TrainingType,
  TrainingSession,
  TrainingProgram,
} from "../lib/database.types";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import {
  ArrowLeft,
  BarChart2,
  User,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

interface StatsProps {
  profile: Profile;
}

interface MetricDataPoint {
  date: string;
  value: number;
}

interface MetricStats {
  metricId: string;
  title: string;
  data: MetricDataPoint[];
  average: number;
}

interface AthleteStats {
  athleteId: string;
  name: string;
  metrics: MetricStats[];
}

interface TrainingLoadData {
  date: string;
  dailyLoad: number;
  weeklyLoad: number;
  chronicLoad: number;
  acwr: number;
  compliance: number;
}

interface AthleteTrainingLoad {
  athleteId: string;
  name: string;
  data: TrainingLoadData[];
}

// Add this constant at the top of the file with other constants
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// Add these helper functions before the component
const calculateDailyLoad = async (
  athleteId: string,
  date: string
): Promise<number> => {
  const { data: sessions, error } = await supabase
    .from("training_sessions")
    .select("unit_load")
    .eq("athlete_id", athleteId)
    .eq("date", date);

  if (error) {
    console.error("Error fetching daily load:", error);
    return 0;
  }

  return (
    sessions?.reduce((sum, session) => sum + (session.unit_load || 0), 0) || 0
  );
};

const calculateWeeklyLoad = async (
  athleteId: string,
  endDate: string
): Promise<number> => {
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6); // Get last 7 days including end date

  const { data: sessions, error } = await supabase
    .from("training_sessions")
    .select("unit_load")
    .eq("athlete_id", athleteId)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate);

  if (error) {
    console.error("Error fetching weekly load:", error);
    return 0;
  }

  return (
    sessions?.reduce((sum, session) => sum + (session.unit_load || 0), 0) || 0
  );
};

const calculateChronicLoad = async (
  athleteId: string,
  endDate: string
): Promise<number> => {
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 27); // Get last 28 days including end date

  const { data: sessions, error } = await supabase
    .from("training_sessions")
    .select("unit_load")
    .eq("athlete_id", athleteId)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate);

  if (error) {
    console.error("Error fetching chronic load:", error);
    return 0;
  }

  const totalLoad =
    sessions?.reduce((sum, session) => sum + (session.unit_load || 0), 0) || 0;
  return sessions?.length ? totalLoad / 28 : 0; // Average over 28 days
};

const calculateACWR = (weeklyLoad: number, chronicLoad: number): number => {
  return chronicLoad > 0 ? weeklyLoad / chronicLoad : 0;
};

const getACWRColor = (acwr: number): string => {
  if (acwr >= 0.8 && acwr <= 1.3) return "text-green-600";
  if ((acwr >= 0.6 && acwr < 0.8) || (acwr > 1.3 && acwr <= 1.5))
    return "text-yellow-600";
  return "text-red-600";
};

const calculateCompliance = async (
  athleteId: string,
  startDate: string,
  endDate: string
): Promise<number> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const { data: sessions, error } = await supabase
    .from("training_sessions")
    .select("date")
    .eq("athlete_id", athleteId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    console.error("Error fetching compliance data:", error);
    return 0;
  }

  const uniqueDays = new Set(sessions?.map((s) => s.date));
  return (uniqueDays.size / totalDays) * 100;
};

// Add this constant before the WeeklyLoadTable component
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

interface WeeklyLoadTableProps {
  trainingSessions: TrainingSession[];
}

const WeeklyLoadTable = ({ trainingSessions }: WeeklyLoadTableProps) => {
  // Group sessions by day of the week
  const sessionsByDay = trainingSessions.reduce((acc, session) => {
    const date = new Date(session.date);
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    if (!acc[day]) {
      acc[day] = { AM: null, PM: null, dailyLoad: 0 };
    }
    acc[day][session.session as "AM" | "PM"] = session;
    acc[day].dailyLoad += session.unit_load || 0;
    return acc;
  }, {} as Record<string, { AM: TrainingSession | null; PM: TrainingSession | null; dailyLoad: number }>);

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const weeklyLoad = Object.values(sessionsByDay).reduce(
    (sum, day) => sum + (day.dailyLoad || 0),
    0
  );

  // Calculate statistics with safety checks
  const dailyLoads = days.map((day) => sessionsByDay[day]?.dailyLoad || 0);
  const meanDailyLoad = weeklyLoad / 7;

  // Calculate standard deviation with safety check
  const standardDeviation = Math.sqrt(
    dailyLoads.reduce(
      (acc, load) => acc + Math.pow(load - meanDailyLoad, 2),
      0
    ) / 7
  );

  // Calculate training monotony with safety check for division by zero
  const trainingMonotony =
    standardDeviation === 0 ? 0 : meanDailyLoad / standardDeviation;

  // Calculate strain
  const strain = weeklyLoad * trainingMonotony;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-blue-600 text-white py-3 px-4 text-center font-bold text-lg">
        WEEKLY TRAINING LOAD OVERVIEW
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-white border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                DAY
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                AM/PM
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type of Session
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                RPE (1-10)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                Duration (min)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                Unit Load
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                DAILY LOAD
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {days.map((day) => {
              const dayData = sessionsByDay[day] || {
                AM: null,
                PM: null,
                dailyLoad: 0,
              };
              return (
                <React.Fragment key={day}>
                  <tr className="hover:bg-gray-50">
                    <td
                      rowSpan={2}
                      className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 align-middle border-r border-gray-200"
                    >
                      {day}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      AM
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dayData.AM?.training_type
                        ? TRAINING_TYPES.find(
                            (t) => t.value === dayData.AM?.training_type
                          )?.label
                        : ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dayData.AM?.rpe || ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dayData.AM?.duration || ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dayData.AM?.unit_load || ""}
                    </td>
                    <td
                      rowSpan={2}
                      className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 align-middle bg-blue-50 border-l border-blue-200"
                    >
                      {dayData.dailyLoad || "0"}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      PM
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dayData.PM?.training_type
                        ? TRAINING_TYPES.find(
                            (t) => t.value === dayData.PM?.training_type
                          )?.label
                        : ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dayData.PM?.rpe || ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dayData.PM?.duration || ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dayData.PM?.unit_load || ""}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-600 text-white font-bold">
              <td colSpan={6} className="px-6 py-3 text-right">
                WEEKLY LOAD
              </td>
              <td className="px-6 py-3">{weeklyLoad || 0}</td>
            </tr>
            <tr className="bg-white border-t-2 border-blue-200">
              <td
                colSpan={6}
                className="px-6 py-3 text-right font-medium text-gray-900"
              >
                Mean Daily training Load
              </td>
              <td className="px-6 py-3 text-gray-900">
                {Math.round(meanDailyLoad) || 0}
              </td>
            </tr>
            <tr className="bg-white border-t border-gray-200">
              <td
                colSpan={6}
                className="px-6 py-3 text-right font-medium text-gray-900"
              >
                Standard Deviation
              </td>
              <td className="px-6 py-3 text-gray-900">
                {!isNaN(standardDeviation) ? Math.round(standardDeviation) : 0}
              </td>
            </tr>
            <tr className="bg-green-50 border border-green-200">
              <td
                colSpan={6}
                className="px-6 py-3 text-right font-medium text-gray-900"
              >
                TRAINING MONOTONY
              </td>
              <td className="px-6 py-3 text-gray-900">
                {!isNaN(trainingMonotony)
                  ? trainingMonotony.toFixed(2)
                  : "0.00"}
              </td>
            </tr>
            <tr className="bg-blue-50 border border-blue-200">
              <td
                colSpan={6}
                className="px-6 py-3 text-right font-medium text-gray-900"
              >
                STRAIN
              </td>
              <td className="px-6 py-3 text-gray-900">
                {!isNaN(strain) ? Math.round(strain) : 0}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// Add this helper function to calculate weekly loads for a given date range
const getWeeklyLoad = (
  sessions: TrainingSession[],
  startDate: Date,
  endDate: Date
): number => {
  return sessions
    .filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startDate && sessionDate <= endDate;
    })
    .reduce((sum, session) => sum + (session.unit_load || 0), 0);
};

// Add these helper functions for date manipulation
const getWeekDates = (date: Date) => {
  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + 1);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday,
    end: sunday,
  };
};

const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

// Move ExerciseHistoryChart above the main component
function ExerciseHistoryChart({
  history,
  exercise,
}: {
  history: any[];
  exercise: string;
}) {
  if (!history || history.length === 0) {
    return (
      <div className="text-gray-400 text-center">
        No data for this exercise.
      </div>
    );
  }

  // Flatten all series_data for each record into points with date, weight, reps
  const points: { date: string; weight: number; reps: number }[] = [];
  history.forEach((rec) => {
    if (
      rec.series_data &&
      Array.isArray(rec.series_data) &&
      rec.series_data.length > 0
    ) {
      rec.series_data.forEach((serie: any, idx: number) => {
        points.push({
          date: rec.date,
          weight: serie.weight,
          reps: serie.reps,
        });
      });
    } else if (rec.weight != null && rec.reps != null) {
      points.push({ date: rec.date, weight: rec.weight, reps: rec.reps });
    }
  });

  if (points.length === 0) {
    return (
      <div className="text-gray-400 text-center">
        No data for this exercise.
      </div>
    );
  }

  // Group by date, and for each date, average the weights and reps (or just plot all points)
  // We'll plot all points for now
  const labels = points.map((p) => new Date(p.date).toLocaleDateString());

  const chartData = {
    labels,
    datasets: [
      {
        label: "Weight (kg)",
        data: points.map((p) => p.weight),
        borderColor: "#6366f1",
        backgroundColor: "#c7d2fe",
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: false,
        yAxisID: "y",
      },
      {
        label: "Reps",
        data: points.map((p) => p.reps),
        borderColor: "#f59e42",
        backgroundColor: "#fde68a",
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: false,
        yAxisID: "y1",
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const idx = context.dataIndex;
            const p = points[idx];
            return `${context.dataset.label}: ${context.parsed.y} (${
              p
                ? `Date: ${new Date(p.date).toLocaleDateString()}, Weight: ${
                    p.weight
                  }, Reps: ${p.reps}`
                : ""
            })`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Weight (kg)" },
        position: "left" as const,
      },
      y1: {
        beginAtZero: true,
        title: { display: true, text: "Reps" },
        position: "right" as const,
        grid: { drawOnChartArea: false },
      },
    },
  };
  return <Line data={chartData} options={chartOptions} height={220} />;
}

// Helper to get ISO week number
function getISOWeek(dateString: string) {
  const date = new Date(dateString);
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// Weekly Load Chart Component
function WeeklyLoadChart({ records }: { records: any[] }) {
  // Group records by ISO week number
  const weeklyLoad: Record<string, number> = {};
  records.forEach((rec) => {
    const week = getISOWeek(rec.date);
    let total = 0;
    if (rec.series_data && Array.isArray(rec.series_data)) {
      rec.series_data.forEach((serie: any) => {
        const weight = Number(serie.weight);
        const reps = Number(serie.reps);
        if (!isNaN(weight) && !isNaN(reps)) {
          total += weight * reps;
        }
      });
    } else if (rec.weight != null && rec.reps != null) {
      const weight = Number(rec.weight);
      const reps = Number(rec.reps);
      if (!isNaN(weight) && !isNaN(reps)) {
        total += weight * reps;
      }
    }
    weeklyLoad[week] = (weeklyLoad[week] || 0) + total;
  });
  // Prepare chart data
  const weeks = Object.keys(weeklyLoad).sort((a, b) => Number(a) - Number(b));
  const values = weeks.map((w) => weeklyLoad[w]);
  let yMax = 100; // default value
  if (values.length > 0) {
    yMax = Math.max(...values, 1);
    if (weeks.length === 1) {
      yMax = Math.max(100, yMax * 1.2);
    } else {
      yMax = yMax * 1.2;
    }
  }
  const data = {
    labels: weeks.map((w) => `Week ${w}`),
    datasets: [
      {
        label: "Weekly Load (kg)",
        data: values,
        backgroundColor: "#6366f1",
        maxBarThickness: 40,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "WEEKLY LOAD (Kg)", font: { size: 18 } },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `Weekly Load: ${context.parsed.y} kg`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Load (kg)" },
        max: yMax,
      },
      x: { title: { display: true, text: "Week" } },
    },
  };
  return <Bar data={data} options={options} height={140} />;
}

export default function Statistics({ profile }: StatsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [athleteStats, setAthleteStats] = useState<AthleteStats[]>([]);
  const [trainingLoads, setTrainingLoads] = useState<AthleteTrainingLoad[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(
    []
  );
  const [currentWeek, setCurrentWeek] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [planAExercises, setPlanAExercises] = useState<string[]>([]);
  const [planBExercises, setPlanBExercises] = useState<string[]>([]);
  const [openChartKeys, setOpenChartKeys] = useState<Record<string, boolean>>(
    {}
  );
  const [exerciseHistories, setExerciseHistories] = useState<
    Record<string, any[]>
  >({});
  const [exerciseLoading, setExerciseLoading] = useState<
    Record<string, boolean>
  >({});
  const [allExerciseRecords, setAllExerciseRecords] = useState<any[]>([]);

  // Add a new constant for the current week's end date string
  const currentWeekEndDateString = currentWeek?.end
    ? formatDate(currentWeek.end)
    : "";

  // Add a new function to find the most recent week with data
  const findMostRecentWeekWithData = async (athleteId: string) => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const { data: sessions, error } = await supabase
      .from("training_sessions")
      .select("date")
      .eq("athlete_id", athleteId)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .lte("date", today.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (error || !sessions || sessions.length === 0) {
      // If no data found, return current week
      return getWeekDates(today);
    }

    // Get the most recent date with data
    const mostRecentDate = new Date(sessions[0].date);
    return getWeekDates(mostRecentDate);
  };

  // Update useEffect to initialize the current week
  useEffect(() => {
    const initializeWeek = async () => {
      if (!profile?.id) return;

      const athleteId = selectedAthlete || profile.id;
      const mostRecentWeek = await findMostRecentWeekWithData(athleteId);
      setCurrentWeek(mostRecentWeek);
    };

    initializeWeek();
  }, [profile?.id, selectedAthlete]);

  // Update the training sessions fetch effect
  useEffect(() => {
    const fetchTrainingSessions = async () => {
      if (!currentWeek || !profile?.id) return;

      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("athlete_id", selectedAthlete || profile.id)
        .gte("date", formatDate(currentWeek.start))
        .lte("date", formatDate(currentWeek.end))
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching training sessions:", error);
        return;
      }

      setTrainingSessions(data || []);
    };

    fetchTrainingSessions();
  }, [profile?.id, currentWeek, selectedAthlete]);

  // Update the navigateWeek function
  const navigateWeek = async (direction: "prev" | "next") => {
    if (!currentWeek) return;

    const newStart = new Date(currentWeek.start);
    newStart.setDate(newStart.getDate() + (direction === "next" ? 7 : -7));
    const newWeek = getWeekDates(newStart);

    // Check if there's data for the new week
    const { data } = await supabase
      .from("training_sessions")
      .select("date")
      .eq("athlete_id", selectedAthlete || profile.id)
      .gte("date", formatDate(newWeek.start))
      .lte("date", formatDate(newWeek.end))
      .limit(1);

    // Only update if there's data or we're navigating back to a previous week
    if ((data && data.length > 0) || direction === "prev") {
      setCurrentWeek(newWeek);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!profile?.id) return;

      setLoading(true);

      try {
        // Fetch athletes
        const { data: athletesData, error: athletesError } = await supabase
          .from("profiles")
          .select("*")
          .eq("manager_id", profile.id)
          .eq("role", "athlete")
          .order("full_name");

        if (athletesError) throw athletesError;

        // Fetch metrics
        const { data: metricsData, error: metricsError } = await supabase
          .from("custom_metrics")
          .select("*")
          .eq("manager_id", profile.id)
          .order("title");

        if (metricsError) throw metricsError;

        setAthletes(athletesData || []);
        setMetrics(metricsData || []);

        // Set the first athlete as default if there are athletes
        if (athletesData && athletesData.length > 0) {
          setSelectedAthlete(athletesData[0].id);
        }

        // Initial stats fetch
        if (athletesData && metricsData && athletesData.length > 0) {
          await fetchStats(athletesData, metricsData, athletesData[0].id);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [profile?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id || athletes.length === 0 || metrics.length === 0) return;

      setLoading(true);
      try {
        await fetchStats(athletes, metrics, selectedAthlete);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    selectedAthlete,
    profile?.id,
    athletes.length,
    metrics.length,
    currentWeek,
  ]);

  // Update the fetchStats function
  const fetchStats = async (
    athletesList: Profile[],
    metricsList: CustomMetric[],
    selectedAthleteId: string
  ) => {
    try {
      setLoading(true);
      // Reset training loads when starting a new fetch
      setTrainingLoads([]);
      setTrainingSessions([]);

      // Ensure currentWeek is available before proceeding
      if (!currentWeek) return;

      // Get date 5 weeks before the start date for ACWR calculation
      const startDate = new Date(currentWeek.start);
      const fiveWeeksBeforeStart = new Date(startDate);
      fiveWeeksBeforeStart.setDate(fiveWeeksBeforeStart.getDate() - 7 * 5);
      const fiveWeeksBeforeStartStr = fiveWeeksBeforeStart
        .toISOString()
        .split("T")[0];

      // Fetch training sessions for selected athlete, including historical data for ACWR
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("athlete_id", selectedAthleteId)
        .gte("date", fiveWeeksBeforeStartStr)
        .lte("date", currentWeek.end.toISOString().split("T")[0])
        .order("date");

      if (sessionsError) throw sessionsError;

      // Filter sessions to only include those within the selected date range for the table
      const displaySessions = (sessions || []).filter(
        (session) =>
          session.date >= currentWeek.start.toISOString().split("T")[0] &&
          session.date <= currentWeek.end.toISOString().split("T")[0]
      );
      setTrainingSessions(displaySessions);

      // Keep all sessions for load calculations
      const allSessions = sessions || [];

      const selectedAthlete = athletesList.find(
        (a) => a.id === selectedAthleteId
      );

      // Only calculate and display training loads if there are sessions in the selected date range
      if (selectedAthlete && allSessions.length > 0) {
        const loads: AthleteTrainingLoad[] = [];
        const athleteLoadData: TrainingLoadData[] = [];

        // Iterate for the last 5 weeks (or as many as available up to range.start)
        for (let i = 0; i < 5; i++) {
          const weekEndDate = new Date(currentWeek.end);
          weekEndDate.setDate(weekEndDate.getDate() - i * 7);
          const weekStartDate = new Date(weekEndDate);
          weekStartDate.setDate(weekStartDate.getDate() - 6);

          // Ensure we don't go before the fetched data's earliest date
          // For simplicity, we'll just calculate based on available sessions.
          // A more robust solution might fetch more historical data if needed.

          const currentWeeklyLoad = getWeeklyLoad(
            allSessions,
            weekStartDate,
            weekEndDate
          );

          // Calculate previous 4 weeks' loads for chronic load relative to this week
          const previousFourWeeksLoads: number[] = [];
          for (let j = 1; j <= 4; j++) {
            const prevWeekEnd = new Date(weekStartDate);
            prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
            const prevWeekStart = new Date(prevWeekEnd);
            prevWeekStart.setDate(prevWeekStart.getDate() - 6);

            const weekLoad = getWeeklyLoad(
              allSessions,
              prevWeekStart,
              prevWeekEnd
            );
            previousFourWeeksLoads.push(weekLoad);
          }

          const chronicLoad =
            previousFourWeeksLoads.length > 0
              ? previousFourWeeksLoads.reduce((sum, load) => sum + load, 0) /
                previousFourWeeksLoads.length
              : 0;

          const acwr = chronicLoad > 0 ? currentWeeklyLoad / chronicLoad : 0;

          const dailyLoad = allSessions
            .filter(
              (session) =>
                session.date === weekEndDate.toISOString().split("T")[0]
            )
            .reduce((sum, session) => sum + (session.unit_load || 0), 0);

          // Calculate compliance for this specific week's end date (last 28 days from this end date)
          const complianceEndDate = weekEndDate;
          const complianceStartDate = new Date(complianceEndDate);
          complianceStartDate.setDate(complianceStartDate.getDate() - 27);

          const uniqueDates = new Set(
            allSessions
              .filter((session) => {
                const sessionDate = new Date(session.date);
                return (
                  sessionDate >= complianceStartDate &&
                  sessionDate <= complianceEndDate
                );
              })
              .map((session) => session.date)
          );

          const compliance = (uniqueDates.size / 28) * 100;

          athleteLoadData.push({
            date: weekEndDate.toISOString().split("T")[0],
            dailyLoad,
            weeklyLoad: currentWeeklyLoad,
            chronicLoad,
            acwr,
            compliance,
          });
        }

        // Sort the data by date in ascending order for the chart
        athleteLoadData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        loads.push({
          athleteId: selectedAthlete.id,
          name: selectedAthlete.full_name,
          data: athleteLoadData,
        });

        setTrainingLoads(loads);
      }

      // Rest of the function for metric responses...
      const { data: responses, error: responsesError } = await supabase
        .from("metric_responses")
        .select("*")
        .eq("athlete_id", selectedAthleteId)
        .gte("date", currentWeek.start.toISOString().split("T")[0])
        .lte("date", currentWeek.end.toISOString().split("T")[0])
        .order("date");

      if (responsesError) throw responsesError;

      if (!responses || responses.length === 0) {
        setAthleteStats([]);
        return;
      }

      // Process metric responses...
      const stats: AthleteStats[] = [];
      const athlete = athletesList.find((a) => a.id === selectedAthleteId);
      if (!athlete) return;

      const athleteMetricStats: MetricStats[] = [];
      for (const metric of metricsList.filter((m) => m.type === "rating")) {
        const metricResponses = responses.filter(
          (r) => r.metric_id === metric.id
        );

        if (metricResponses.length === 0) continue;

        const dataPoints = metricResponses.map((r) => ({
          date: r.date,
          value: r.rating_value || 0,
        }));

        const sum = dataPoints.reduce((acc, point) => acc + point.value, 0);
        const avg = dataPoints.length > 0 ? sum / dataPoints.length : 0;

        athleteMetricStats.push({
          metricId: metric.id,
          title: metric.title,
          data: dataPoints,
          average: Math.round(avg * 100) / 100,
        });
      }

      if (athleteMetricStats.length > 0) {
        stats.push({
          athleteId: selectedAthleteId,
          name: athlete.full_name,
          metrics: athleteMetricStats,
        });
      }

      setAthleteStats(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setTrainingSessions([]);
      setTrainingLoads([]);
      setAthleteStats([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get chart data for a specific metric across athletes
  const getMetricChartData = (metricId: string) => {
    // Find all athletes that have data for this metric
    const datasets = athleteStats
      .filter((athlete) => athlete.metrics.some((m) => m.metricId === metricId))
      .map((athlete) => {
        const metricData = athlete.metrics.find((m) => m.metricId === metricId);
        return {
          label: athlete.name,
          data: metricData?.data.map((d) => d.value) || [],
          borderColor: getRandomColor(athlete.athleteId),
          backgroundColor: getRandomColor(athlete.athleteId, 0.2),
          tension: 0.4,
        };
      });

    // Get all unique dates
    const allDates = new Set<string>();
    athleteStats.forEach((athlete) => {
      athlete.metrics
        .filter((m) => m.metricId === metricId)
        .forEach((metric) => {
          metric.data.forEach((d) => allDates.add(d.date));
        });
    });

    const dates = Array.from(allDates).sort();

    return {
      labels: dates,
      datasets,
    };
  };

  // Get a random color based on a string
  const getRandomColor = (str: string, alpha = 1) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const h = Math.abs(hash) % 360;
    return `hsla(${h}, 70%, 60%, ${alpha})`;
  };

  // Get average data for bar chart
  const getAverageChartData = () => {
    const labels: string[] = [];
    const data: number[] = [];
    const backgrounds: string[] = [];

    athleteStats.forEach((athlete) => {
      athlete.metrics.forEach((metric) => {
        labels.push(`${athlete.name} - ${metric.title}`);
        data.push(metric.average);
        backgrounds.push(getRandomColor(metric.metricId, 0.6));
      });
    });

    return {
      labels,
      datasets: [
        {
          label: "Average Rating",
          data,
          backgroundColor: backgrounds,
        },
      ],
    };
  };

  // Fetch program when selectedAthlete changes
  useEffect(() => {
    const fetchProgram = async () => {
      if (!selectedAthlete) return;
      const { data, error } = await supabase
        .from("training_programs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error) {
        setProgram(null);
        setPlanAExercises([]);
        setPlanBExercises([]);
        return;
      }
      setProgram(data);
      setPlanAExercises(data.plan_a_exercises || []);
      setPlanBExercises(data.plan_b_exercises || []);
    };
    fetchProgram();
  }, [selectedAthlete]);

  // Helper to fetch exercise history
  const fetchExerciseHistory = async (athleteId: string, exercise: string) => {
    const { data, error } = await supabase
      .from("exercise_records")
      .select("id, athlete_id, exercise_name, weight, reps, date, series_data")
      .eq("athlete_id", athleteId)
      .eq("exercise_name", exercise)
      .order("date", { ascending: true });
    if (error) return [];
    return data || [];
  };

  // Handler to open/close chart and fetch data if needed
  const handleToggleChart = async (exercise: string) => {
    setOpenChartKeys((prev) => ({ ...prev, [exercise]: !prev[exercise] }));
    if (!exerciseHistories[exercise] && selectedAthlete) {
      setExerciseLoading((prev) => ({ ...prev, [exercise]: true }));
      const history = await fetchExerciseHistory(selectedAthlete, exercise);
      setExerciseHistories((prev) => ({ ...prev, [exercise]: history }));
      setExerciseLoading((prev) => ({ ...prev, [exercise]: false }));
    }
  };

  // Fetch all exercise records for the selected athlete when athlete changes
  useEffect(() => {
    const fetchAllRecords = async () => {
      if (!selectedAthlete) return;
      const { data, error } = await supabase
        .from("exercise_records")
        .select(
          "id, athlete_id, exercise_name, weight, reps, date, series_data"
        )
        .eq("athlete_id", selectedAthlete);
      setAllExerciseRecords(data || []);
    };
    fetchAllRecords();
  }, [selectedAthlete]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-indigo-500" />
          Filter Data
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label
              htmlFor="athlete-select"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
            >
              <User className="h-4 w-4 mr-1 text-gray-500" />
              Athlete
            </label>
            <select
              id="athlete-select"
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-full"
              required
            >
              <option value="" disabled>
                Select an Athlete
              </option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="start-date"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
            >
              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-full"
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
            >
              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-full"
            />
          </div>
        </div>
      </div>

      {/* Weekly Load Chart Section */}
      {selectedAthlete && allExerciseRecords.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <WeeklyLoadChart records={allExerciseRecords} />
        </div>
      )}

      {/* Chart section */}
      <div className="space-y-8">
        {/* Week Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateWeek("prev")}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous Week
            </button>
            <div className="text-center">
              {currentWeek && (
                <>
                  <div className="text-sm font-medium text-gray-900">
                    {currentWeek.start.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                    {" - "}
                    {currentWeek.end.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {trainingSessions.length > 0 && (
                    <div className="text-xs text-blue-600 font-medium mt-1">
                      {trainingSessions.length} sessions this week
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => navigateWeek("next")}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Next Week
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        </div>

        {/* Weekly Load Table */}
        <WeeklyLoadTable trainingSessions={trainingSessions} />

        {/* Training Load Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-indigo-500" />
            Training Load Analysis
          </h2>

          {trainingLoads.length > 0 ? (
            trainingLoads.map((athleteLoad) => {
              // Debugging logs
              console.log(
                "currentWeekEndDateString:",
                currentWeekEndDateString
              );
              console.log(
                "athleteLoad.data dates:",
                athleteLoad.data.map((d) => d.date)
              );
              const currentWeekData = athleteLoad.data.find(
                (d) => d.date === currentWeekEndDateString
              );
              console.log("Found currentWeekData:", currentWeekData);

              return (
                <div key={athleteLoad.athleteId} className="mb-8 last:mb-0">
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    {athleteLoad.name}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Remove Daily Load Card */}
                    {/*
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500">
                          Daily Load
                        </h4>
                        <p className="text-2xl font-semibold text-gray-900">
                          {athleteLoad.data.find(d => d.date === currentWeekEndDateString)?.dailyLoad.toFixed(0) || 0}
                        </p>
                      </div>
                      */}

                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600">
                        Weekly Load
                      </h4>
                      <p className="text-2xl font-semibold text-gray-900">
                        {athleteLoad.data
                          .find((d) => d.date === currentWeekEndDateString)
                          ?.weeklyLoad.toFixed(0) || 0}
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600">
                        Chronic Load
                      </h4>
                      <p className="text-2xl font-semibold text-gray-900">
                        {athleteLoad.data
                          .find((d) => d.date === currentWeekEndDateString)
                          ?.chronicLoad.toFixed(0) || 0}
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600">
                        ACWR
                      </h4>
                      <p
                        className={`text-2xl font-semibold ${getACWRColor(
                          athleteLoad.data.find(
                            (d) => d.date === currentWeekEndDateString
                          )?.acwr || 0
                        )}`}
                      >
                        {athleteLoad.data
                          .find((d) => d.date === currentWeekEndDateString)
                          ?.acwr.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>

                  {/* ACWR Chart */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">
                      ACWR Trend
                    </h4>
                    <div className="h-64">
                      <Line
                        data={{
                          labels: athleteLoad.data.map((d) => d.date),
                          datasets: [
                            {
                              label: "ACWR",
                              data: athleteLoad.data.map((d) => d.acwr),
                              borderColor: "rgb(79, 70, 229)",
                              tension: 0.4,
                            },
                          ],
                        }}
                        options={{
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 2,
                            },
                          },
                          plugins: {
                            annotation: {
                              annotations: {
                                greenZone: {
                                  type: "box",
                                  yMin: 0.8,
                                  yMax: 1.3,
                                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                                  borderWidth: 0,
                                },
                                yellowZone1: {
                                  type: "box",
                                  yMin: 0.6,
                                  yMax: 0.8,
                                  backgroundColor: "rgba(234, 179, 8, 0.1)",
                                  borderWidth: 0,
                                },
                                yellowZone2: {
                                  type: "box",
                                  yMin: 1.3,
                                  yMax: 1.5,
                                  backgroundColor: "rgba(234, 179, 8, 0.1)",
                                  borderWidth: 0,
                                },
                                redZone1: {
                                  type: "box",
                                  yMin: 0,
                                  yMax: 0.6,
                                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                                  borderWidth: 0,
                                },
                                redZone2: {
                                  type: "box",
                                  yMin: 1.5,
                                  yMax: 2,
                                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                                  borderWidth: 0,
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No training load data available for the selected period.
              </p>
            </div>
          )}
        </div>

        {/* Metric Charts - Only show if there's data */}
        {athleteStats.length > 0 && (
          <>
            {/* Overall Averages */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-indigo-500" />
                Overall Averages
              </h2>
              <div className="h-80">
                <Bar
                  data={getAverageChartData()}
                  options={{
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 5,
                      },
                    },
                    plugins: {
                      legend: {
                        position: "top",
                      },
                      tooltip: {
                        backgroundColor: "rgba(79, 70, 229, 0.9)",
                        padding: 12,
                        titleFont: {
                          size: 14,
                          weight: "bold",
                        },
                        bodyFont: {
                          size: 13,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Individual Metric Trends */}
            {metrics
              .filter((m) => m.type === "rating")
              .filter((metric) => {
                return athleteStats.some((athlete) =>
                  athlete.metrics.some((m) => m.metricId === metric.id)
                );
              })
              .map((metric) => (
                <div
                  key={metric.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-indigo-500" />
                    {metric.title} - Trend Over Time
                  </h2>
                  <div className="h-80">
                    <Line
                      data={getMetricChartData(metric.id)}
                      options={{
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 5,
                            grid: {
                              color: "rgba(0, 0, 0, 0.05)",
                            },
                          },
                          x: {
                            grid: {
                              color: "rgba(0, 0, 0, 0.05)",
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            position: "top",
                          },
                          tooltip: {
                            backgroundColor: "rgba(79, 70, 229, 0.9)",
                            padding: 12,
                            titleFont: {
                              size: 14,
                              weight: "bold",
                            },
                            bodyFont: {
                              size: 13,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              ))}
          </>
        )}

        {/* Personal Records Section - Moved to Records page */}
        {/* Team Leaderboard Section - Moved to Records page */}
      </div>
    </div>
  );
}
