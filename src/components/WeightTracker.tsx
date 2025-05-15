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
import { Scale, Plus } from "lucide-react";
import clsx from "clsx";

interface Props {
  athleteId: string;
  theme?: "light" | "dark" | "system";
}

export default function WeightTracker({ athleteId, theme = "light" }: Props) {
  const [weightRecords, setWeightRecords] = useState<
    { weight: number; date: string }[]
  >([]);
  const [newWeight, setNewWeight] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || isNaN(parseFloat(newWeight))) {
      setError("Please enter a valid weight");
      return;
    }
    try {
      const weight = parseFloat(newWeight);
      const now = new Date().toISOString();
      // Try to update existing row
      const { data, error: fetchError } = await supabase
        .from("weight_records")
        .select("id, weights, weight_dates")
        .eq("athlete_id", athleteId)
        .single();
      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
      if (data) {
        // Update existing row
        const { error } = await supabase
          .from("weight_records")
          .update({
            weights: [...(data.weights || []), weight],
            weight_dates: [...(data.weight_dates || []), now],
          })
          .eq("athlete_id", athleteId);
        if (error) throw error;
      } else {
        // Insert new row
        const { error } = await supabase.from("weight_records").insert({
          athlete_id: athleteId,
          weights: [weight],
          weight_dates: [now],
        });
        if (error) throw error;
      }
      setNewWeight("");
      fetchWeightRecords();
    } catch (err) {
      setError("Failed to add weight record");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div
      className={clsx(
        "rounded-2xl p-6",
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
            Weight Tracker
          </h2>
          <p
            className={clsx(
              "text-sm",
              theme === "dark" ? "text-slate-400" : "text-gray-500"
            )}
          >
            Monitor your weight progress
          </p>
        </div>
      </div>

      {/* Add Weight Form */}
      <form onSubmit={handleAddWeight} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="Enter weight (kg)"
              className={clsx(
                "w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500/50 transition-all duration-200",
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-700 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              )}
            />
          </div>
          <button
            type="submit"
            className={clsx(
              "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2",
              theme === "dark"
                ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-1 ring-blue-500/30"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </form>

      {error && (
        <div
          className={clsx(
            "p-4 rounded-lg mb-4",
            theme === "dark"
              ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
              : "bg-red-50 text-red-600 border border-red-200"
          )}
        >
          {error}
        </div>
      )}

      {/* Weight Chart */}
      {weightRecords.length > 0 ? (
        <div className="mt-6" style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={weightRecords}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === "dark" ? "#334155" : "#e2e8f0"}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
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
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={theme === "dark" ? "#60a5fa" : "#2563eb"}
                strokeWidth={2}
                dot={{ fill: theme === "dark" ? "#60a5fa" : "#2563eb" }}
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
            Start tracking your weight by adding your first record
          </p>
        </div>
      )}

      {/* Recent Records Table */}
      {weightRecords.length > 0 && (
        <div className="mt-6">
          <h3
            className={clsx(
              "text-sm font-medium mb-3",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Recent Records
          </h3>
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
                {weightRecords
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((record) => (
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
