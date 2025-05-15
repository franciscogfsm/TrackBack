import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { WeightRecord } from "../lib/database.types";
import { Scale, Plus, Check } from "lucide-react";
import clsx from "clsx";

interface Props {
  athleteId: string;
  theme?: "light" | "dark" | "system";
}

export default function WeightInput({ athleteId, theme = "light" }: Props) {
  const [weightRecords, setWeightRecords] = useState<
    { weight: number; date: string }[]
  >([]);
  const [newWeight, setNewWeight] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        // Combine and sort by date descending
        const combined = weights
          .map((w: number, i: number) => ({
            weight: w,
            date: weight_dates[i] || null,
          }))
          .filter((rec: any) => rec.date !== null);
        combined.sort(
          (a: { date: string }, b: { date: string }) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setWeightRecords(combined.slice(0, 3));
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
      setSuccess(true);
      fetchWeightRecords();
      setTimeout(() => setSuccess(false), 2000);
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
            Enter your weight and track your progress
          </p>
        </div>
      </div>
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
      {success && (
        <div
          className={clsx(
            "mb-4 flex items-center gap-2 p-3 rounded-lg",
            theme === "dark"
              ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          )}
        >
          <Check className="h-5 w-5" />
          <span>Weight added successfully!</span>
        </div>
      )}
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
              {weightRecords.map((record) => (
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
    </div>
  );
}
