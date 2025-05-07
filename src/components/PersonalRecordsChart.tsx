import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { supabase } from "../lib/supabase";
import { useTheme } from "./ThemeProvider";
import clsx from "clsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PersonalRecord {
  id: string;
  exercise: string;
  weight: number;
  record_date: string;
}

export default function PersonalRecordsChart({
  athleteId,
  refreshKey,
}: {
  athleteId: string;
  refreshKey?: number;
}) {
  const { theme } = useTheme();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId || athleteId === "" || athleteId === "all") return;
    const fetchRecords = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("personal_records")
        .select("id, exercise, weight, record_date")
        .eq("athlete_id", athleteId)
        .order("record_date", { ascending: true });
      if (!error && data) {
        setRecords(data);
        if (data.length > 0 && !selectedExercise) {
          setSelectedExercise(data[0].exercise);
        }
      }
      setLoading(false);
    };
    fetchRecords();
    // eslint-disable-next-line
  }, [athleteId, refreshKey]);

  const exercises = Array.from(new Set(records.map((r) => r.exercise)));
  const filtered = records.filter((r) => r.exercise === selectedExercise);

  const chartData = {
    labels: filtered.map((r) => new Date(r.record_date).toLocaleDateString()),
    datasets: [
      {
        label: selectedExercise,
        data: filtered.map((r) => r.weight),
        borderColor: "#fbbf24",
        backgroundColor: "#fde68a",
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: theme === "dark" ? "#fff" : "#222",
        },
      },
      title: {
        display: true,
        text: `Evolução do Recorde de ${selectedExercise} (1RM)`,
        color: theme === "dark" ? "#fff" : "#222",
        font: { size: 18 },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme === "dark" ? "#fff" : "#222",
        },
        title: {
          display: true,
          text: "Data",
          color: theme === "dark" ? "#fff" : "#222",
        },
      },
      y: {
        ticks: {
          color: theme === "dark" ? "#fff" : "#222",
        },
        title: {
          display: true,
          text: "Carga (kg)",
          color: theme === "dark" ? "#fff" : "#222",
        },
      },
    },
  };

  const bestRecord =
    filtered.length > 0 ? Math.max(...filtered.map((r) => r.weight)) : null;

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500">
        Please select an athlete
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No personal best found for this exercise.
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-2xl shadow-lg mt-8 mx-auto w-full border border-gray-100 bg-gradient-to-br from-white to-yellow-50",
        theme === "dark"
          ? "bg-slate-800/70 ring-1 ring-slate-700/50"
          : "bg-white border border-gray-100"
      )}
      style={{ minWidth: 320 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 pt-5 pb-2 border-b border-gray-100 bg-yellow-50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-yellow-700 text-base">
            {selectedExercise}
          </span>
          {bestRecord !== null && (
            <span className="ml-3 px-3 py-1 rounded-full bg-yellow-200 text-yellow-900 text-xs font-bold shadow-sm">
              Best: {bestRecord} kg
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label
            className={clsx(
              "font-medium text-sm",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Exercise:
          </label>
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className={clsx(
              "px-4 py-2 rounded-lg border text-sm pr-12 min-w-[200px] shadow-sm transition-all duration-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white hover:bg-yellow-50",
              "bg-[url('data:image/svg+xml;utf8,<svg fill='none' stroke='%23333' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'></path></svg>')] bg-no-repeat bg-[right_1rem_center]",
              theme === "dark"
                ? "bg-slate-900/50 border-slate-700 text-white hover:bg-slate-800"
                : "bg-white border-gray-300 text-gray-900 hover:bg-yellow-50"
            )}
            style={{ appearance: "none" }}
          >
            {exercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="w-full p-4 flex items-center justify-center">
        <div className="w-full" style={{ minHeight: 125 }}>
          <Line
            data={chartData}
            options={chartOptions}
            height={125}
            width={undefined}
          />
        </div>
      </div>
    </div>
  );
}
