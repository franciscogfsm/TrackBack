import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type {
  TrainingProgram,
  ExerciseRecord,
  Profile,
} from "../lib/database.types";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";

interface Props {
  managerId: string;
  athletes: Profile[];
  theme: "light" | "dark" | "system";
}

export default function TrainingProgramManager({
  managerId,
  athletes,
  theme,
}: Props) {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [currentProgram, setCurrentProgram] = useState<TrainingProgram | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [planAExercises, setPlanAExercises] = useState<string[]>([]);
  const [planBExercises, setPlanBExercises] = useState<string[]>([]);
  const [newExerciseA, setNewExerciseA] = useState("");
  const [newExerciseB, setNewExerciseB] = useState("");
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [openSeriesKey, setOpenSeriesKey] = useState<string | null>(null);
  const [openRecordKey, setOpenRecordKey] = useState<string | null>(null);
  const [openAthleteKey, setOpenAthleteKey] = useState<string | null>(null);

  useEffect(() => {
    fetchPrograms();
    fetchRecords();
  }, [managerId]);

  useEffect(() => {
    fetchRecords();
  }, [selectedAthlete, selectedDate]);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from("training_programs")
      .select("*")
      .eq("manager_id", managerId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching programs:", error);
      return;
    }

    setPrograms(data || []);
    if (data && data.length > 0) {
      setCurrentProgram(data[0]);
      setPlanAExercises(data[0].plan_a_exercises);
      setPlanBExercises(data[0].plan_b_exercises);
    }
  };

  const fetchRecords = async () => {
    let query = supabase
      .from("exercise_records")
      .select("*")
      .eq("date", selectedDate);

    if (selectedAthlete !== "all") {
      query = query.eq("athlete_id", selectedAthlete);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching records:", error);
      return;
    }

    setRecords(data || []);
  };

  const handleCreateProgram = async () => {
    if (!planAExercises.length || !planBExercises.length) {
      alert("Please add exercises to both plans");
      return;
    }

    const { data, error } = await supabase
      .from("training_programs")
      .insert({
        manager_id: managerId,
        plan_a_exercises: planAExercises,
        plan_b_exercises: planBExercises,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating program:", error);
      return;
    }

    setPrograms([data, ...programs]);
    setCurrentProgram(data);
    setIsEditing(false);
  };

  const handleUpdateProgram = async () => {
    if (!currentProgram) return;

    const { error } = await supabase
      .from("training_programs")
      .update({
        plan_a_exercises: planAExercises,
        plan_b_exercises: planBExercises,
      })
      .eq("id", currentProgram.id);

    if (error) {
      console.error("Error updating program:", error);
      return;
    }

    setPrograms(
      programs.map((p) =>
        p.id === currentProgram.id
          ? {
              ...p,
              plan_a_exercises: planAExercises,
              plan_b_exercises: planBExercises,
            }
          : p
      )
    );
    setIsEditing(false);
  };

  const handleAddExerciseA = () => {
    if (newExerciseA.trim()) {
      setPlanAExercises([...planAExercises, newExerciseA.trim()]);
      setNewExerciseA("");
    }
  };

  const handleAddExerciseB = () => {
    if (newExerciseB.trim()) {
      setPlanBExercises([...planBExercises, newExerciseB.trim()]);
      setNewExerciseB("");
    }
  };

  const handleRemoveExerciseA = (index: number) => {
    setPlanAExercises(planAExercises.filter((_, i) => i !== index));
  };

  const handleRemoveExerciseB = (index: number) => {
    setPlanBExercises(planBExercises.filter((_, i) => i !== index));
  };

  // Group records by athlete
  const recordsByAthlete = records.reduce((acc, rec) => {
    if (!acc[rec.athlete_id]) acc[rec.athlete_id] = [];
    acc[rec.athlete_id].push(rec);
    return acc;
  }, {} as Record<string, ExerciseRecord[]>);

  return (
    <div
      className={clsx(
        "rounded-2xl shadow-sm p-6 mb-8",
        theme === "dark"
          ? "bg-slate-800/50 ring-1 ring-slate-700/50"
          : "bg-white/90 shadow-xl shadow-blue-900/5"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <h2
          className={clsx(
            "text-2xl font-bold",
            theme === "dark" ? "text-white" : "text-gray-900"
          )}
        >
          Training Programs
        </h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={clsx(
            "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2",
            theme === "dark"
              ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          )}
        >
          {isEditing ? (
            <X className="h-4 w-4" />
          ) : (
            <Edit2 className="h-4 w-4" />
          )}
          {isEditing ? "Cancel" : "Edit Program"}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-6">
          <div>
            <h3
              className={clsx(
                "text-lg font-semibold mb-4",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Plan A Exercises
            </h3>
            <div className="space-y-2">
              {planAExercises.map((exercise, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={exercise}
                    onChange={(e) => {
                      const newExercises = [...planAExercises];
                      newExercises[index] = e.target.value;
                      setPlanAExercises(newExercises);
                    }}
                    className={clsx(
                      "flex-1 px-4 py-2 rounded-lg border",
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                  <button
                    onClick={() => handleRemoveExerciseA(index)}
                    className={clsx(
                      "p-2 rounded-lg",
                      theme === "dark"
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-red-600 hover:bg-red-50"
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newExerciseA}
                  onChange={(e) => setNewExerciseA(e.target.value)}
                  placeholder="Add new exercise"
                  className={clsx(
                    "flex-1 px-4 py-2 rounded-lg border",
                    theme === "dark"
                      ? "bg-slate-900/50 border-slate-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                />
                <button
                  onClick={handleAddExerciseA}
                  className={clsx(
                    "p-2 rounded-lg",
                    theme === "dark"
                      ? "text-blue-400 hover:bg-blue-500/10"
                      : "text-blue-600 hover:bg-blue-50"
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3
              className={clsx(
                "text-lg font-semibold mb-4",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Plan B Exercises
            </h3>
            <div className="space-y-2">
              {planBExercises.map((exercise, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={exercise}
                    onChange={(e) => {
                      const newExercises = [...planBExercises];
                      newExercises[index] = e.target.value;
                      setPlanBExercises(newExercises);
                    }}
                    className={clsx(
                      "flex-1 px-4 py-2 rounded-lg border",
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                  <button
                    onClick={() => handleRemoveExerciseB(index)}
                    className={clsx(
                      "p-2 rounded-lg",
                      theme === "dark"
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-red-600 hover:bg-red-50"
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newExerciseB}
                  onChange={(e) => setNewExerciseB(e.target.value)}
                  placeholder="Add new exercise"
                  className={clsx(
                    "flex-1 px-4 py-2 rounded-lg border",
                    theme === "dark"
                      ? "bg-slate-900/50 border-slate-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                />
                <button
                  onClick={handleAddExerciseB}
                  className={clsx(
                    "p-2 rounded-lg",
                    theme === "dark"
                      ? "text-blue-400 hover:bg-blue-500/10"
                      : "text-blue-600 hover:bg-blue-50"
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsEditing(false)}
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
              onClick={
                currentProgram ? handleUpdateProgram : handleCreateProgram
              }
              className={clsx(
                "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2",
                theme === "dark"
                  ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              <Save className="h-4 w-4" />
              {currentProgram ? "Update Program" : "Create Program"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                {planAExercises.map((exercise, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    {exercise}
                  </li>
                ))}
              </ul>
            </div>
            <div>
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
                {planBExercises.map((exercise, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    {exercise}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <h3
              className={clsx(
                "text-lg font-semibold mb-4",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Training Records
            </h3>
            <div className="flex gap-4 mb-4">
              <select
                value={selectedAthlete}
                onChange={(e) => setSelectedAthlete(e.target.value)}
                className={clsx(
                  "px-4 py-2 rounded-lg border appearance-none pr-10",
                  theme === "dark"
                    ? "bg-slate-900/50 border-slate-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                )}
                style={{
                  backgroundImage:
                    "url('data:image/svg+xml;utf8,<svg fill='none' stroke='%23333' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'></path></svg>')",
                  backgroundPosition: "right 0.75rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.25em 1.25em",
                }}
              >
                <option value="all">All Athletes</option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.full_name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={clsx(
                  "px-4 py-2 rounded-lg border",
                  theme === "dark"
                    ? "bg-slate-900/50 border-slate-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                )}
              />
            </div>
            <div className="overflow-x-auto">
              <table
                className={clsx(
                  "min-w-full divide-y",
                  theme === "dark" ? "divide-slate-700/50" : "divide-gray-200"
                )}
              >
                <thead>
                  <tr>
                    <th className="px-4 py-2"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Athlete
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Exercise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Series
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={clsx(
                    "divide-y",
                    theme === "dark" ? "divide-slate-700/50" : "divide-gray-200"
                  )}
                >
                  {Object.entries(recordsByAthlete).map(
                    ([athleteId, athleteRecords]) => {
                      const athlete = athletes.find((a) => a.id === athleteId);
                      return (
                        <React.Fragment key={athleteId}>
                          <tr>
                            <td className="px-4 py-4 align-top">
                              <button
                                onClick={() =>
                                  setOpenAthleteKey(
                                    openAthleteKey === athleteId
                                      ? null
                                      : athleteId
                                  )
                                }
                                className={clsx(
                                  "flex items-center gap-1 text-sm font-medium transition-all",
                                  theme === "dark"
                                    ? "text-blue-300 hover:underline"
                                    : "text-blue-600 hover:underline"
                                )}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                }}
                              >
                                {openAthleteKey === athleteId ? (
                                  <>
                                    Hide <ChevronUp className="w-4 h-4" />
                                  </>
                                ) : (
                                  <>
                                    Show <ChevronDown className="w-4 h-4" />
                                  </>
                                )}
                              </button>
                            </td>
                            <td
                              className={clsx(
                                "px-6 py-4 whitespace-nowrap text-sm font-semibold",
                                theme === "dark"
                                  ? "text-slate-100"
                                  : "text-gray-900"
                              )}
                              colSpan={4}
                            >
                              {athlete?.full_name || athleteId}
                            </td>
                          </tr>
                          {openAthleteKey === athleteId && (
                            <tr>
                              <td
                                colSpan={5}
                                className={clsx(
                                  theme === "dark"
                                    ? "bg-slate-800/40"
                                    : "bg-blue-50/40"
                                )}
                              >
                                <div className="py-4 px-4">
                                  {athleteRecords.length > 0 && (
                                    <div className="mb-2 text-base font-semibold">
                                      Plan:{" "}
                                      <span>
                                        {athleteRecords[0].selected_plan}
                                      </span>
                                    </div>
                                  )}
                                  {athleteRecords.map((rec, idx) => (
                                    <div key={rec.id} className="mb-6">
                                      <div className="mb-2 text-base font-semibold">
                                        Exercise:{" "}
                                        <span>{rec.exercise_name}</span>
                                      </div>
                                      <table className="min-w-[220px] text-sm mb-2">
                                        <thead>
                                          <tr>
                                            <th className="text-left pr-4 font-semibold">
                                              Series
                                            </th>
                                            <th className="text-left pr-4 font-semibold">
                                              Weight
                                            </th>
                                            <th className="text-left font-semibold">
                                              Reps
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rec.series_data &&
                                          rec.series_data.length > 0 ? (
                                            rec.series_data.map(
                                              (serie: any, sidx: number) => (
                                                <tr key={sidx}>
                                                  <td className="pr-4">
                                                    {sidx + 1}
                                                  </td>
                                                  <td className="pr-4">
                                                    {serie.weight}
                                                  </td>
                                                  <td>{serie.reps}</td>
                                                </tr>
                                              )
                                            )
                                          ) : (
                                            <tr>
                                              <td
                                                colSpan={3}
                                                className="text-gray-400"
                                              >
                                                -
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
