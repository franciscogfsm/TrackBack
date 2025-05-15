import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { WeightRecord } from "../lib/database.types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Scale, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

interface Props {
  athleteId: string;
  theme?: "light" | "dark" | "system";
}

type ViewMode = "both" | "chart" | "table";

export default function WeightReport({ athleteId, theme = "light" }: Props) {
  const [weightRecords, setWeightRecords] = useState<
    { weight: number; date: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMode, setTableMode] = useState<"paginated" | "all">("paginated");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchWeightRecords();
  }, [athleteId]);

  const fetchWeightRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("weight_records")
        .select("weights, weight_dates")
        .eq("athlete_id", athleteId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (!data) {
        setWeightRecords([]);
      } else {
        const weights = data.weights || [];
        const weight_dates = data.weight_dates || [];
        // Combine and sort by date ascending
        const combined = weights
          .map((w: number, i: number) => ({
            weight: w,
            date: weight_dates[i] || null,
          }))
          .filter((rec: any) => rec.date !== null);
        combined.sort(
          (a: { date: string }, b: { date: string }) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setWeightRecords(combined);
      }
    } catch (err) {
      setError("Failed to load weight records");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const filteredRecords = weightRecords.filter((rec) => {
    if (startDate && new Date(rec.date) < new Date(startDate)) return false;
    if (endDate && new Date(rec.date) > new Date(endDate)) return false;
    return true;
  });

  return (
    <div
      className={clsx(
        "rounded-2xl p-6 mb-8",
        theme === "dark"
          ? "bg-slate-800/50 ring-1 ring-slate-700/50"
          : "bg-white border border-gray-200"
      )}
    >
      <div className="flex items-center gap-4 mb-6">
        <div
          className={clsx(
            "p-3 rounded-xl",
            theme === "dark"
              ? "bg-blue-500/10 text-blue-400"
              : "bg-blue-100 text-blue-600"
          )}
        >
          <Scale className="w-6 h-6" />
        </div>
        <div>
          <h2
            className={clsx(
              "text-lg font-semibold",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Weight Progress
          </h2>
          <p
            className={clsx(
              "text-sm",
              theme === "dark" ? "text-slate-400" : "text-gray-500"
            )}
          >
            Athlete's weight history
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="font-medium text-sm">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 rounded border text-sm"
          />
          <label className="font-medium text-sm ml-2">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 rounded border text-sm"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="ml-2 px-3 py-1 rounded bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 border"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>
      {error && (
        <div
          className={clsx(
            "mb-4 p-3 rounded-lg",
            theme === "dark"
              ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
              : "bg-red-50 text-red-600 border border-red-200"
          )}
        >
          {error}
        </div>
      )}
      {filteredRecords.length > 0 ? (
        <div className="px-8 py-4 mb-8 w-full max-w-3xl mx-auto">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={filteredRecords}
              margin={{ top: 20, right: 40, left: 20, bottom: 70 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === "dark" ? "#334155" : "#e2e8f0"}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-GB")
                }
                minTickGap={30}
                stroke={theme === "dark" ? "#94a3b8" : "#64748b"}
              />
              <YAxis
                stroke={theme === "dark" ? "#94a3b8" : "#64748b"}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                }}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-GB");
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={theme === "dark" ? "#60a5fa" : "#2563eb"}
                strokeWidth={2}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className={clsx(
            "text-center py-12 rounded-xl",
            theme === "dark" ? "bg-slate-900/50" : "bg-gray-50"
          )}
        >
          <Scale
            className={clsx(
              "mx-auto h-12 w-12 mb-4",
              theme === "dark" ? "text-slate-600" : "text-gray-400"
            )}
          />
          <h3
            className={clsx(
              "text-sm font-medium mb-1",
              theme === "dark" ? "text-slate-300" : "text-gray-900"
            )}
          >
            No weight records yet
          </h3>
          <p
            className={clsx(
              "text-sm",
              theme === "dark" ? "text-slate-400" : "text-gray-500"
            )}
          >
            No data to display
          </p>
        </div>
      )}
      {filteredRecords.length > 0 && (
        <div className="w-full max-w-2xl mx-auto mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
            <h3
              className={clsx(
                "text-sm font-medium",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              All Records
            </h3>
            {tableMode === "paginated" &&
              filteredRecords.length > PAGE_SIZE && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className={clsx(
                      "rounded-full w-10 h-10 flex items-center justify-center border transition",
                      page === 0
                        ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : "border-blue-500 text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-600"
                    )}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    Page {page + 1} of{" "}
                    {Math.ceil(filteredRecords.length / PAGE_SIZE)}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(
                          Math.ceil(filteredRecords.length / PAGE_SIZE) - 1,
                          p + 1
                        )
                      )
                    }
                    disabled={
                      page >= Math.ceil(filteredRecords.length / PAGE_SIZE) - 1
                    }
                    className={clsx(
                      "rounded-full w-10 h-10 flex items-center justify-center border transition",
                      page >= Math.ceil(filteredRecords.length / PAGE_SIZE) - 1
                        ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : "border-blue-500 text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-600"
                    )}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
          </div>
          <div
            className={clsx(
              "rounded-lg overflow-hidden",
              theme === "dark"
                ? "bg-slate-900/50 ring-1 ring-slate-700/50"
                : "bg-gray-50 border border-gray-200"
            )}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead
                className={theme === "dark" ? "bg-slate-800/50" : "bg-gray-50"}
              >
                <tr>
                  <th
                    className={clsx(
                      "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                      theme === "dark" ? "text-slate-400" : "text-gray-500"
                    )}
                  >
                    Date
                  </th>
                  <th
                    className={clsx(
                      "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                      theme === "dark" ? "text-slate-400" : "text-gray-500"
                    )}
                  >
                    Weight (kg)
                  </th>
                </tr>
              </thead>
              <tbody
                className={clsx(
                  "divide-y",
                  theme === "dark" ? "divide-slate-700/50" : "divide-gray-200"
                )}
              >
                {(tableMode === "all"
                  ? filteredRecords.slice().reverse()
                  : filteredRecords
                      .slice()
                      .reverse()
                      .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                ).map((record) => (
                  <tr
                    key={record.date}
                    className={
                      theme === "dark"
                        ? "hover:bg-slate-800/50"
                        : "hover:bg-gray-50"
                    }
                  >
                    <td
                      className={clsx(
                        "px-6 py-4 whitespace-nowrap text-sm",
                        theme === "dark" ? "text-slate-300" : "text-gray-900"
                      )}
                    >
                      {formatDate(record.date)}
                    </td>
                    <td
                      className={clsx(
                        "px-6 py-4 whitespace-nowrap text-sm",
                        theme === "dark" ? "text-slate-300" : "text-gray-900"
                      )}
                    >
                      {record.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
