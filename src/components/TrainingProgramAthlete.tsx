import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { TrainingProgram, ExerciseRecord } from "../lib/database.types";
import {
  Plus,
  Save,
  ChevronDown,
  ChevronUp,
  Check,
  Edit2,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

interface Props {
  athleteId: string;
  theme: "light" | "dark" | "system";
}

interface SeriesData {
  weight: number | "";
  reps: number | "";
  saved?: boolean;
  id?: string;
}

interface ExerciseInput {
  series: SeriesData[];
  numSeries: number;
}

export default function TrainingProgramAthlete({ athleteId, theme }: Props) {
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"A" | "B" | "none">("none");
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isRecording, setIsRecording] = useState(false);
  const [exerciseInputs, setExerciseInputs] = useState<
    Record<string, ExerciseInput>
  >({});
  const [showRecords, setShowRecords] = useState(false);
  const [savingSeries, setSavingSeries] = useState<Record<string, boolean>>({});
  const [savedSeries, setSavedSeries] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProgram();
    fetchRecords();
  }, [athleteId, selectedDate]);

  const fetchProgram = async () => {
    try {
      // First, get the athlete's group_id
      const { data: athleteData, error: athleteError } = await supabase
        .from("profiles")
        .select("group_id")
        .eq("id", athleteId)
        .single();

      if (athleteError) {
        console.error("Error fetching athlete:", athleteError);
        return;
      }

      if (!athleteData?.group_id) {
        console.log("Athlete has no group assigned");
        setProgram(null);
        return;
      }

      // Then fetch the training program for that group
      const { data, error } = await supabase
        .from("training_programs")
        .select("*")
        .eq("group_id", athleteData.group_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching program:", error);
        setProgram(null);
        return;
      }

      setProgram(data);
    } catch (error) {
      console.error("Error in fetchProgram:", error);
      setProgram(null);
    }
  };

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from("exercise_records")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("date", selectedDate);

    if (error) {
      console.error("Error fetching records:", error);
      return;
    }

    setRecords(data || []);

    // Initialize exercise inputs with saved data
    if (data) {
      const newExerciseInputs: Record<string, ExerciseInput> = {};
      data.forEach((record) => {
        if (record.series_data) {
          newExerciseInputs[record.exercise_name] = {
            series: record.series_data.map((serie: any) => ({
              weight: serie.weight,
              reps: serie.reps,
              saved: true,
              id: serie.id,
            })),
            numSeries: record.series_data.length,
          };
        }
      });
      setExerciseInputs(newExerciseInputs);
    }
  };

  const handleStartRecording = () => {
    if (!program) {
      alert("No active training program found");
      return;
    }
    setIsRecording(true);
  };

  const saveSeries = async (exercise: string, serieIndex: number) => {
    if (!program) return;

    const input = exerciseInputs[exercise];
    if (!input) return;

    const serie = input.series[serieIndex];
    if (!serie || serie.weight === "" || serie.reps === "") return;

    setSavingSeries((prev) => ({
      ...prev,
      [`${exercise}-${serieIndex}`]: true,
    }));

    try {
      // Check if we already have a record for this exercise
      const existingRecord = records.find(
        (r) => r.exercise_name === exercise && r.selected_plan === selectedPlan
      );

      // Prepare the full series_data array (all series for this exercise)
      const fullSeriesData = input.series.map((s, idx) => ({
        weight: s.weight === "" ? 0 : Math.abs(Number(s.weight)),
        reps: s.reps === "" ? 0 : Math.abs(Number(s.reps)),
        id: s.id || crypto.randomUUID(),
      }));

      if (existingRecord) {
        // Update existing record with all series
        const { error } = await supabase
          .from("exercise_records")
          .update({ series_data: fullSeriesData })
          .eq("id", existingRecord.id);

        if (error) throw error;
      } else {
        // Create new record with all series
        const newRecord = {
          id: crypto.randomUUID(),
          athlete_id: athleteId,
          program_id: program.id,
          selected_plan: selectedPlan,
          exercise_name: exercise,
          series_data: fullSeriesData,
          date: selectedDate,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("exercise_records")
          .insert(newRecord);

        if (error) throw error;
      }

      // Update local state
      setExerciseInputs((prev) => ({
        ...prev,
        [exercise]: {
          ...prev[exercise],
          series: prev[exercise].series.map((s, i) => ({
            ...s,
            saved: true,
            id: fullSeriesData[i].id,
          })),
        },
      }));

      setSavedSeries((prev) => {
        const updated = { ...prev };
        for (let i = 0; i < fullSeriesData.length; i++) {
          updated[`${exercise}-${i}`] = true;
        }
        return updated;
      });

      // Refresh records
      fetchRecords();
    } catch (error) {
      console.error("Error saving series:", error);
      alert("Error saving series. Please try again.");
    } finally {
      setSavingSeries((prev) => ({
        ...prev,
        [`${exercise}-${serieIndex}`]: false,
      }));
    }
  };

  const handleSaveAll = async () => {
    if (!program) return;

    const exercises =
      selectedPlan === "A"
        ? program.plan_a_exercises
        : program.plan_b_exercises;

    for (const exercise of exercises) {
      const input = exerciseInputs[exercise];
      if (!input) continue;

      // Prepare the full series_data array (all series for this exercise)
      const fullSeriesData = input.series.map((s, idx) => ({
        weight: s.weight === "" ? 0 : Math.abs(Number(s.weight)),
        reps: s.reps === "" ? 0 : Math.abs(Number(s.reps)),
        id: s.id || crypto.randomUUID(),
      }));

      // Check if we already have a record for this exercise
      const existingRecord = records.find(
        (r) => r.exercise_name === exercise && r.selected_plan === selectedPlan
      );

      if (existingRecord) {
        // Update existing record with all series
        const { error } = await supabase
          .from("exercise_records")
          .update({ series_data: fullSeriesData })
          .eq("id", existingRecord.id);
        if (error) throw error;
      } else {
        // Create new record with all series
        const newRecord = {
          id: crypto.randomUUID(),
          athlete_id: athleteId,
          program_id: program.id,
          selected_plan: selectedPlan,
          exercise_name: exercise,
          series_data: fullSeriesData,
          date: selectedDate,
          created_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("exercise_records")
          .insert(newRecord);
        if (error) throw error;
      }

      // Update local state
      setExerciseInputs((prev) => ({
        ...prev,
        [exercise]: {
          ...prev[exercise],
          series: prev[exercise].series.map((s, i) => ({
            ...s,
            saved: true,
            id: fullSeriesData[i].id,
          })),
        },
      }));

      setSavedSeries((prev) => {
        const updated = { ...prev };
        for (let i = 0; i < fullSeriesData.length; i++) {
          updated[`${exercise}-${i}`] = true;
        }
        return updated;
      });
    }

    // Refresh records after all saves
    fetchRecords();
    setIsRecording(false);
  };

  const deleteSeries = async (exercise: string, serieIndex: number) => {
    const existingRecord = records.find(
      (r) => r.exercise_name === exercise && r.selected_plan === selectedPlan
    );

    if (existingRecord) {
      const updatedSeriesData = [...(existingRecord.series_data || [])];
      updatedSeriesData.splice(serieIndex, 1);

      if (updatedSeriesData.length === 0) {
        // Delete the entire record if no series left
        await supabase
          .from("exercise_records")
          .delete()
          .eq("id", existingRecord.id);
      } else {
        // Update the record with remaining series
        await supabase
          .from("exercise_records")
          .update({ series_data: updatedSeriesData })
          .eq("id", existingRecord.id);
      }
    }

    // Update local state
    setExerciseInputs((prev) => ({
      ...prev,
      [exercise]: {
        ...prev[exercise],
        series: prev[exercise].series.filter((_, i) => i !== serieIndex),
        numSeries: prev[exercise].numSeries - 1,
      },
    }));

    fetchRecords();
  };

  const hasPlanA = program && program.plan_a_exercises.length > 0;
  const hasPlanB = program && program.plan_b_exercises.length > 0;
  const hasPlans = hasPlanA || hasPlanB;

  // Group records by exercise_name
  const groupedRecords = records.reduce((acc, rec) => {
    if (!acc[rec.exercise_name]) acc[rec.exercise_name] = [];
    acc[rec.exercise_name].push(rec);
    return acc;
  }, {} as Record<string, ExerciseRecord[]>);

  return (
    <div
      className={clsx(
        "rounded-2xl shadow-sm p-6 mb-8",
        theme === "dark"
          ? "bg-slate-800/50 ring-1 ring-slate-700/50"
          : "bg-white/90 shadow-xl shadow-blue-900/5",
        "w-full max-w-2xl mx-auto",
        "sm:p-6 p-3"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2
          className={clsx(
            "text-2xl font-bold",
            theme === "dark" ? "text-white" : "text-gray-900"
          )}
        >
          Training Program
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={clsx(
              "px-4 py-2 rounded-lg border w-full sm:w-auto",
              theme === "dark"
                ? "bg-slate-900/50 border-slate-700 text-white"
                : "bg-white border-gray-300 text-gray-900"
            )}
          />
          {!isRecording && (
            <button
              onClick={handleStartRecording}
              className={clsx(
                "w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 justify-center",
                theme === "dark"
                  ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              <Plus className="h-4 w-4" />
              Record Training
            </button>
          )}
        </div>
      </div>

      {isRecording ? (
        <div className="space-y-6">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedPlan("A")}
              className={clsx(
                "flex-1 px-4 py-3 rounded-lg font-medium text-sm",
                selectedPlan === "A"
                  ? theme === "dark"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-600 text-white"
                  : theme === "dark"
                  ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              Plan A
            </button>
            <button
              onClick={() => setSelectedPlan("B")}
              className={clsx(
                "flex-1 px-4 py-3 rounded-lg font-medium text-sm",
                selectedPlan === "B"
                  ? theme === "dark"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-600 text-white"
                  : theme === "dark"
                  ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              Plan B
            </button>
          </div>

          {selectedPlan !== "none" && program && (
            <div className="space-y-4">
              <h3
                className={clsx(
                  "text-lg font-semibold",
                  theme === "dark" ? "text-white" : "text-gray-900"
                )}
              >
                {selectedPlan === "A" ? "Plan A" : "Plan B"} Exercises
              </h3>
              <div className="space-y-4">
                {(selectedPlan === "A"
                  ? program.plan_a_exercises
                  : program.plan_b_exercises
                ).map((exercise, index) => {
                  const input = exerciseInputs[exercise] || {
                    series: [{ weight: "", reps: "" }],
                    numSeries: 1,
                  };
                  return (
                    <div
                      key={index}
                      className={clsx(
                        "p-4 rounded-lg",
                        theme === "dark" ? "bg-slate-700/50" : "bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={clsx(
                            "font-medium",
                            theme === "dark" ? "text-white" : "text-gray-900"
                          )}
                        >
                          {exercise}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <label
                          className={clsx(
                            "text-sm",
                            theme === "dark"
                              ? "text-slate-300"
                              : "text-gray-600"
                          )}
                        >
                          Series:
                        </label>
                        <select
                          value={input.numSeries}
                          onChange={(e) => {
                            const num = Number(e.target.value);
                            setExerciseInputs((prev) => {
                              const prevInput = prev[exercise] || {
                                series: [],
                                numSeries: 1,
                              };
                              let newSeries = [...prevInput.series];
                              if (num > newSeries.length) {
                                newSeries = [
                                  ...newSeries,
                                  ...Array(num - newSeries.length).fill({
                                    weight: "",
                                    reps: "",
                                  }),
                                ];
                              } else if (num < newSeries.length) {
                                newSeries = newSeries.slice(0, num);
                              }
                              return {
                                ...prev,
                                [exercise]: {
                                  ...prevInput,
                                  numSeries: num,
                                  series: newSeries,
                                },
                              };
                            });
                          }}
                          className={clsx(
                            "px-2 py-1 rounded border appearance-none pr-8",
                            theme === "dark"
                              ? "bg-slate-900/50 border-slate-700 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          )}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        {input.series.map((serie, serieIdx) => (
                          <div
                            key={serieIdx}
                            className="grid grid-cols-2 gap-3"
                          >
                            <div>
                              <label
                                className={clsx(
                                  "block text-xs mb-1",
                                  theme === "dark"
                                    ? "text-slate-300"
                                    : "text-gray-600"
                                )}
                              >
                                Weight (kg) - Serie {serieIdx + 1}
                              </label>
                              <input
                                type="number"
                                value={
                                  serie.weight === 0 || serie.weight === null
                                    ? ""
                                    : serie.weight
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExerciseInputs((prev) => {
                                    const prevInput = prev[exercise] || {
                                      series: [],
                                      numSeries: 1,
                                    };
                                    let newSeries = [...prevInput.series];
                                    if (
                                      newSeries.length < prevInput.numSeries
                                    ) {
                                      newSeries = [
                                        ...newSeries,
                                        ...Array(
                                          prevInput.numSeries - newSeries.length
                                        ).fill({ weight: "", reps: "" }),
                                      ];
                                    }
                                    newSeries = newSeries.map((s, i) =>
                                      i === serieIdx
                                        ? {
                                            ...s,
                                            weight:
                                              val === "" ? "" : Number(val),
                                            saved: false,
                                          }
                                        : s
                                    );
                                    return {
                                      ...prev,
                                      [exercise]: {
                                        ...prevInput,
                                        series: newSeries,
                                      },
                                    };
                                  });
                                }}
                                className={clsx(
                                  "w-full px-3 py-2 rounded-lg border",
                                  theme === "dark"
                                    ? "bg-slate-900/50 border-slate-700 text-white"
                                    : "bg-white border-gray-300 text-gray-900",
                                  serie.saved ? "border-green-500" : ""
                                )}
                                disabled={serie.saved}
                              />
                            </div>
                            <div>
                              <label
                                className={clsx(
                                  "block text-xs mb-1",
                                  theme === "dark"
                                    ? "text-slate-300"
                                    : "text-gray-600"
                                )}
                              >
                                Reps - Serie {serieIdx + 1}
                              </label>
                              <input
                                type="number"
                                value={
                                  serie.reps === 0 || serie.reps === null
                                    ? ""
                                    : serie.reps
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExerciseInputs((prev) => {
                                    const prevInput = prev[exercise] || {
                                      series: [],
                                      numSeries: 1,
                                    };
                                    let newSeries = [...prevInput.series];
                                    if (
                                      newSeries.length < prevInput.numSeries
                                    ) {
                                      newSeries = [
                                        ...newSeries,
                                        ...Array(
                                          prevInput.numSeries - newSeries.length
                                        ).fill({ weight: "", reps: "" }),
                                      ];
                                    }
                                    newSeries = newSeries.map((s, i) =>
                                      i === serieIdx
                                        ? {
                                            ...s,
                                            reps: val === "" ? "" : Number(val),
                                            saved: false,
                                          }
                                        : s
                                    );
                                    return {
                                      ...prev,
                                      [exercise]: {
                                        ...prevInput,
                                        series: newSeries,
                                      },
                                    };
                                  });
                                }}
                                className={clsx(
                                  "w-full px-3 py-2 rounded-lg border",
                                  theme === "dark"
                                    ? "bg-slate-900/50 border-slate-700 text-white"
                                    : "bg-white border-gray-300 text-gray-900",
                                  serie.saved ? "border-green-500" : ""
                                )}
                                disabled={serie.saved}
                              />
                            </div>
                            <div className="col-span-2 flex justify-end gap-2">
                              {serie.saved ? (
                                <div className="flex items-center gap-2 text-green-500">
                                  <Check className="h-4 w-4" />
                                  <span className="text-sm">Saved</span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      saveSeries(exercise, serieIdx)
                                    }
                                    disabled={
                                      savingSeries[`${exercise}-${serieIdx}`] ||
                                      !serie.weight ||
                                      !serie.reps
                                    }
                                    className={clsx(
                                      "px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1",
                                      theme === "dark"
                                        ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                                        : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    )}
                                  >
                                    {savingSeries[`${exercise}-${serieIdx}`] ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        <span>Saving...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Save className="h-4 w-4" />
                                        <span>Save Series</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() =>
                                      deleteSeries(exercise, serieIdx)
                                    }
                                    className={clsx(
                                      "px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1",
                                      theme === "dark"
                                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                        : "bg-red-100 text-red-600 hover:bg-red-200"
                                    )}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsRecording(false)}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium text-sm",
                theme === "dark"
                  ? "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2",
                theme === "dark"
                  ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              <Save className="h-4 w-4" />
              Save All Unsaved Series
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {!hasPlans ? (
            <div
              className={clsx(
                "rounded-lg px-4 py-3 text-sm font-medium text-center mt-8",
                theme === "dark"
                  ? "bg-slate-800/60 text-slate-200"
                  : "bg-gray-100 text-gray-700 border border-gray-200"
              )}
            >
              No training program assigned to your group. Please contact your
              manager to get assigned to a group with a training program.
            </div>
          ) : (
            <>
              {hasPlanA && (
                <div>
                  <h3
                    className={clsx(
                      "text-lg font-semibold mb-4",
                      theme === "dark" ? "text-white" : "text-gray-900"
                    )}
                  >
                    Plan A
                  </h3>
                  <ul
                    className={clsx(
                      "space-y-2",
                      theme === "dark" ? "text-slate-300" : "text-gray-600"
                    )}
                  >
                    {program.plan_a_exercises.map((exercise, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span
                          className={clsx(
                            "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium",
                            theme === "dark"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-blue-100 text-blue-600"
                          )}
                        >
                          {index + 1}
                        </span>
                        {exercise}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasPlanB && (
                <div className={hasPlanA ? "mt-6" : undefined}>
                  <h3
                    className={clsx(
                      "text-lg font-semibold mb-4",
                      theme === "dark" ? "text-white" : "text-gray-900"
                    )}
                  >
                    Plan B
                  </h3>
                  <ul
                    className={clsx(
                      "space-y-2",
                      theme === "dark" ? "text-slate-300" : "text-gray-600"
                    )}
                  >
                    {program.plan_b_exercises.map((exercise, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span
                          className={clsx(
                            "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium",
                            theme === "dark"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-blue-100 text-blue-600"
                          )}
                        >
                          {index + 1}
                        </span>
                        {exercise}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mb-4">
                <div
                  className={clsx(
                    "rounded-lg px-4 py-3 text-sm font-medium",
                    theme === "dark"
                      ? "bg-blue-900/60 text-blue-200"
                      : "bg-blue-50 text-blue-800 border border-blue-100"
                  )}
                >
                  If you didn't do any of the plans, please do not fill out this
                  section.
                </div>
              </div>
              {records.length > 0 && (
                <>
                  <div className="block sm:hidden">
                    <button
                      onClick={() => setShowRecords((prev) => !prev)}
                      className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-lg font-semibold text-base mb-2",
                        theme === "dark"
                          ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      )}
                    >
                      Today's Records
                      {showRecords ? (
                        <ChevronUp className="w-5 h-5 ml-2" />
                      ) : (
                        <ChevronDown className="w-5 h-5 ml-2" />
                      )}
                    </button>
                    {showRecords && (
                      <div className="space-y-4 mt-2">
                        {Object.entries(groupedRecords).map(
                          ([exercise, recs]) => (
                            <div
                              key={exercise}
                              className={clsx(
                                "rounded-xl border bg-white shadow p-4 flex flex-col gap-2",
                                theme === "dark"
                                  ? "bg-slate-800/80 border-slate-700 text-white"
                                  : "border-gray-200"
                              )}
                            >
                              <div className="flex justify-between mb-2">
                                <span className="font-semibold">Exercise:</span>{" "}
                                <span>{exercise}</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr>
                                      <th className="pr-2 text-left">Series</th>
                                      <th className="pr-2 text-left">Weight</th>
                                      <th className="pr-2 text-left">Reps</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(recs[0] as any).series_data &&
                                      (recs[0] as any).series_data.map(
                                        (serie: any, idx: number) => (
                                          <tr key={idx}>
                                            <td className="pr-2">{idx + 1}</td>
                                            <td className="pr-2">
                                              {serie.weight}
                                            </td>
                                            <td className="pr-2">
                                              {serie.reps}
                                            </td>
                                          </tr>
                                        )
                                      )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block overflow-x-auto w-full">
                    <table
                      className={clsx(
                        "min-w-full divide-y text-sm",
                        theme === "dark"
                          ? "divide-slate-700/50"
                          : "divide-gray-200"
                      )}
                    >
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider whitespace-nowrap">
                            Plan
                          </th>
                          <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider whitespace-nowrap">
                            Exercise
                          </th>
                          <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider whitespace-nowrap">
                            Series (W x R)
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={clsx(
                          "divide-y",
                          theme === "dark"
                            ? "divide-slate-700/50"
                            : "divide-gray-200"
                        )}
                      >
                        {Object.entries(groupedRecords).map(
                          ([exercise, recs]) => (
                            <tr
                              key={exercise}
                              className="hover:bg-blue-50 sm:hover:bg-transparent"
                            >
                              <td className="px-4 py-2 whitespace-nowrap">
                                {recs[0].selected_plan}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {exercise}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {(recs[0] as any).series_data &&
                                  (recs[0] as any).series_data
                                    .map(
                                      (serie: any, idx: number) =>
                                        `${idx + 1}: ${serie.weight}x${
                                          serie.reps
                                        }`
                                    )
                                    .join(", ")}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
