import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type {
  TrainingProgram,
  ExerciseRecord,
  Profile,
  AthleteGroup,
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

interface Props {
  managerId: string;
  athletes: Profile[];
  theme: "light" | "dark" | "system";
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
  const [programGroup, setProgramGroup] = useState<string>("");
  const [newExerciseA, setNewExerciseA] = useState("");
  const [newExerciseB, setNewExerciseB] = useState("");
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [openRecordKey, setOpenRecordKey] = useState<string | null>(null);
  const [openAthleteKey, setOpenAthleteKey] = useState<string | null>(null);
  const [groups, setGroups] = useState<AthleteGroup[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchPrograms();
    fetchRecords();
    fetchGroups();
  }, [managerId]);

  useEffect(() => {
    fetchRecords();
  }, [selectedAthlete, selectedDate]);

  // Function to handle program selection
  const handleProgramSelect = (program: TrainingProgram) => {
    setCurrentProgram(program);
    setPlanAExercises(program.plan_a_exercises);
    setPlanBExercises(program.plan_b_exercises);
    setProgramGroup(
      program.group_id || (groups.length > 0 ? groups[0].id : "")
    );
    setIsEditing(false);
  };

  // Function to start creating a new program
  const handleCreateNew = () => {
    setCurrentProgram(null);
    setPlanAExercises([]);
    setPlanBExercises([]);
    setProgramGroup(groups.length > 0 ? groups[0].id : "");
    setIsEditing(true);
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("athlete_groups")
      .select("*")
      .eq("manager_id", managerId)
      .order("name");

    if (error) {
      console.error("Error fetching groups:", error);
      return;
    }

    setGroups(data || []);
  };

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from("training_programs")
      .select("*")
      .eq("manager_id", managerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching programs:", error);
      return;
    }

    setPrograms((data || []).filter((program) => program !== null));
    // Don't auto-select a program anymore - let user choose
    if (data && data.length > 0 && !currentProgram) {
      const validPrograms = data.filter((program) => program !== null);
      if (validPrograms.length > 0) {
        // Only set if no current program is selected
        setCurrentProgram(validPrograms[0]);
        setPlanAExercises(validPrograms[0].plan_a_exercises);
        setPlanBExercises(validPrograms[0].plan_b_exercises);
        setProgramGroup(
          validPrograms[0].group_id || (groups.length > 0 ? groups[0].id : "")
        );
      }
    }
  };

  const fetchRecords = async () => {
    let query = supabase
      .from("exercise_records")
      .select("*")
      .eq("date", selectedDate);

    // Only filter by specific athlete if one is selected
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

  // Helper function to get group name by ID
  const getGroupName = (groupId: string | null): string => {
    if (!groupId) return "Unknown Group";
    const group = groups.find((g) => g.id === groupId);
    return group ? group.name : `Group ${groupId}`;
  };

  // Helper function to get program name based on group assignment
  const getProgramName = (program: TrainingProgram): string => {
    if (!program.group_id) return "Unknown Group";
    const group = groups.find((g) => g.id === program.group_id);
    return group ? group.name : `Group ${program.group_id}`;
  };

  const handleCreateProgram = async () => {
    if (!planAExercises.length || !planBExercises.length) {
      console.error("Please add exercises to both plans");
      return;
    }

    if (!programGroup) {
      console.error("Please select a group");
      return;
    }

    if (isCreating) {
      console.log("Already creating, ignoring click");
      return;
    }

    setIsCreating(true);

    console.log("Creating program with:", {
      manager_id: managerId,
      plan_a_exercises: planAExercises,
      plan_b_exercises: planBExercises,
      group_id: programGroup,
    });

    try {
      const { data, error } = await supabase
        .from("training_programs")
        .insert({
          manager_id: managerId,
          plan_a_exercises: planAExercises,
          plan_b_exercises: planBExercises,
          group_id: programGroup,
        })
        .select()
        .single();

      console.log("Supabase response:", { data, error });

      if (error) {
        console.error("Error creating program:", error);
        setIsCreating(false);
        return;
      }

      // If no data returned from insert, fetch the programs again
      if (!data) {
        console.log("No data returned from insert, fetching programs...");
        await fetchPrograms();
        setIsEditing(false);
        setIsCreating(false);
        return;
      }

      console.log("Program created successfully:", data);

      // Update state
      setPrograms([data, ...programs]);
      setCurrentProgram(data);
      setIsEditing(false);
      setIsCreating(false);
      setIsCreating(false);

      console.log("State updated, should exit editing mode");
    } catch (err) {
      console.error("Unexpected error creating program:", err);
      setIsCreating(false);
    }
  };

  const handleUpdateProgram = async () => {
    if (!currentProgram) return;

    if (!programGroup) {
      console.error("Please select a group");
      return;
    }

    const { error } = await supabase
      .from("training_programs")
      .update({
        plan_a_exercises: planAExercises,
        plan_b_exercises: planBExercises,
        group_id: programGroup,
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
              group_id: programGroup,
            }
          : p
      )
    );
    setIsEditing(false);
  };

  const handleDeleteProgram = async (programId: string) => {
    setProgramToDelete(programId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteProgram = async () => {
    if (!programToDelete) return;

    const { error } = await supabase
      .from("training_programs")
      .delete()
      .eq("id", programToDelete);

    if (error) {
      console.error("Error deleting program:", error);
      return;
    }

    setPrograms(programs.filter((p) => p.id !== programToDelete));

    // If we deleted the currently selected program, clear selection
    if (currentProgram?.id === programToDelete) {
      setCurrentProgram(null);
      setPlanAExercises([]);
      setPlanBExercises([]);
      setProgramGroup(groups.length > 0 ? groups[0].id : "");
    }

    setShowDeleteDialog(false);
    setProgramToDelete(null);
  };

  const cancelDeleteProgram = () => {
    setShowDeleteDialog(false);
    setProgramToDelete(null);
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
        "rounded-2xl shadow-sm p-4 sm:p-6 mb-8",
        theme === "dark"
          ? "bg-blue-900/50 ring-1 ring-blue-700/50"
          : "bg-blue-50/90 shadow-xl shadow-blue-900/10"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2
          className={clsx(
            "text-xl sm:text-2xl font-bold",
            theme === "dark" ? "text-white" : "text-gray-900"
          )}
        >
          Training Programs
        </h2>
        <div className="flex gap-2">
          {!isEditing && (
            <button
              onClick={handleCreateNew}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 w-full sm:w-auto",
                theme === "dark"
                  ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  : "bg-green-50 text-green-600 hover:bg-green-100"
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="sm:inline">Create New Program</span>
            </button>
          )}
          {currentProgram && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 w-full sm:w-auto",
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
              <span className="sm:inline">
                {isEditing ? "Cancel" : "Edit Program"}
              </span>
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-6">
          {/* Group Selection */}
          <div>
            <label
              className={clsx(
                "block text-sm font-medium mb-2",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Assign to Group
            </label>
            <select
              value={programGroup}
              onChange={(e) => setProgramGroup(e.target.value)}
              className={clsx(
                "px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base min-w-48 appearance-none bg-no-repeat pr-8",
                theme === "dark"
                  ? "bg-blue-900/50 border-blue-700 text-blue-100"
                  : "bg-blue-50 border-blue-300 text-blue-900"
              )}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${
                  theme === "dark" ? "%236b7280" : "%236b7280"
                }' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1rem 1rem",
              }}
            >
              {groups.length === 0 ? (
                <option value="">No groups available</option>
              ) : (
                groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))
              )}
            </select>
            <p
              className={clsx(
                "text-xs mt-1",
                theme === "dark" ? "text-blue-300" : "text-blue-600"
              )}
            >
              {programGroup && groups.find((g) => g.id === programGroup)
                ? `This program will only be visible to athletes in ${getGroupName(
                    programGroup
                  )} and will be named '${getGroupName(programGroup)}'`
                : "Please select a group to assign this program to"}
            </p>
          </div>

          <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-2 sm:gap-6">
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
                        "flex-1 px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base",
                        theme === "dark"
                          ? "bg-blue-900/50 border-blue-700 text-blue-100"
                          : "bg-blue-50 border-blue-300 text-blue-900"
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
                      "flex-1 px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base",
                      theme === "dark"
                        ? "bg-blue-900/50 border-blue-700 text-blue-100"
                        : "bg-blue-50 border-blue-300 text-blue-900"
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
                        "flex-1 px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base",
                        theme === "dark"
                          ? "bg-blue-900/50 border-blue-700 text-blue-100"
                          : "bg-blue-50 border-blue-300 text-blue-900"
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
                      "flex-1 px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base",
                      theme === "dark"
                        ? "bg-blue-900/50 border-blue-700 text-blue-100"
                        : "bg-blue-50 border-blue-300 text-blue-900"
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
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium text-sm order-2 sm:order-1",
                theme === "dark"
                  ? "text-blue-300 hover:text-white hover:bg-blue-700/50"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              Cancel
            </button>
            <button
              onClick={
                currentProgram ? handleUpdateProgram : handleCreateProgram
              }
              disabled={isCreating}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed",
                theme === "dark"
                  ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              <Save className="h-4 w-4" />
              {isCreating
                ? "Creating..."
                : currentProgram
                ? "Update Program"
                : "Create Program"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Programs List */}
          {programs.length === 0 ? (
            <div className="text-center py-12">
              <div
                className={clsx(
                  "text-sm mb-4",
                  theme === "dark" ? "text-blue-300" : "text-blue-600"
                )}
              >
                No training programs found. Create your first program!
              </div>
              <button
                onClick={handleCreateNew}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 mx-auto",
                  theme === "dark"
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : "bg-green-50 text-green-600 hover:bg-green-100"
                )}
              >
                <Plus className="h-4 w-4" />
                Create First Program
              </button>
            </div>
          ) : (
            <>
              {/* Programs Grid */}
              <div>
                <h3
                  className={clsx(
                    "text-lg font-semibold mb-4",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Your Training Programs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {programs
                    .filter((program) => program !== null)
                    .map((program) => (
                      <div
                        key={program.id}
                        className={clsx(
                          "p-4 rounded-xl border transition-all duration-200 relative",
                          currentProgram?.id === program.id
                            ? theme === "dark"
                              ? "bg-blue-900/70 border-blue-600 ring-2 ring-blue-500/50"
                              : "bg-blue-100 border-blue-400 ring-2 ring-blue-300"
                            : theme === "dark"
                            ? "bg-blue-900/30 border-blue-700 hover:bg-blue-900/50"
                            : "bg-white border-blue-200 hover:bg-blue-50"
                        )}
                      >
                        <div
                          onClick={() => handleProgramSelect(program)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4
                              className={clsx(
                                "font-medium",
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              )}
                            >
                              {getProgramName(program)}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProgram(program.id);
                              }}
                              className={clsx(
                                "p-1 rounded-md hover:bg-red-500/10 transition-colors",
                                theme === "dark"
                                  ? "text-red-400 hover:text-red-300"
                                  : "text-red-500 hover:text-red-600"
                              )}
                              title="Delete program"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span
                                className={clsx(
                                  "font-medium",
                                  theme === "dark"
                                    ? "text-blue-300"
                                    : "text-blue-600"
                                )}
                              >
                                Plan A:
                              </span>
                              <span
                                className={clsx(
                                  "ml-1",
                                  theme === "dark"
                                    ? "text-blue-100"
                                    : "text-gray-700"
                                )}
                              >
                                {program.plan_a_exercises.length} exercises
                              </span>
                            </div>
                            <div>
                              <span
                                className={clsx(
                                  "font-medium",
                                  theme === "dark"
                                    ? "text-blue-300"
                                    : "text-blue-600"
                                )}
                              >
                                Plan B:
                              </span>
                              <span
                                className={clsx(
                                  "ml-1",
                                  theme === "dark"
                                    ? "text-blue-100"
                                    : "text-gray-700"
                                )}
                              >
                                {program.plan_b_exercises.length} exercises
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Selected Program Details */}
              {currentProgram && (
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
                        theme === "dark" ? "text-white" : "text-gray-600"
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
                        theme === "dark" ? "text-white" : "text-gray-600"
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
              )}
            </>
          )}

          <div className="mt-8">
            <h3
              className={clsx(
                "text-lg font-semibold mb-4",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Training Records
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setSelectedAthlete("all"); // Reset athlete selection when group changes
                }}
                className={clsx(
                  "px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base flex-1 sm:flex-none sm:min-w-40 appearance-none bg-no-repeat pr-8",
                  theme === "dark"
                    ? "bg-blue-900/50 border-blue-700 text-blue-100"
                    : "bg-blue-50 border-blue-300 text-blue-900"
                )}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${
                    theme === "dark" ? "%236b7280" : "%236b7280"
                  }' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundSize: "1rem 1rem",
                }}
              >
                <option value="all">All Groups</option>
                {/* Get groups from groups state */}
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
                <option value="no-group">No Group</option>
              </select>
              <select
                value={selectedAthlete}
                onChange={(e) => setSelectedAthlete(e.target.value)}
                className={clsx(
                  "px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base flex-1 sm:flex-none sm:min-w-40 appearance-none bg-no-repeat pr-8",
                  theme === "dark"
                    ? "bg-blue-900/50 border-blue-700 text-blue-100"
                    : "bg-blue-50 border-blue-300 text-blue-900"
                )}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${
                    theme === "dark" ? "%236b7280" : "%236b7280"
                  }' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundSize: "1rem 1rem",
                }}
              >
                <option value="all">All Athletes</option>
                {/* Filter athletes based on selected group */}
                {athletes
                  .filter((athlete) => {
                    if (selectedGroup === "all") return true;
                    if (selectedGroup === "no-group") return !athlete.group_id;
                    return athlete.group_id === selectedGroup;
                  })
                  .map((athlete) => (
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
                  "px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base flex-1 sm:flex-none",
                  theme === "dark"
                    ? "bg-blue-900/50 border-blue-700 text-blue-100"
                    : "bg-blue-50 border-blue-300 text-blue-900"
                )}
              />
            </div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table
                className={clsx(
                  "min-w-full divide-y",
                  theme === "dark" ? "divide-slate-700/50" : "divide-gray-200"
                )}
              >
                <thead>
                  <tr>
                    <th className="px-4 py-2"></th>
                    <th
                      className={clsx(
                        "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-900"
                      )}
                    >
                      Athlete
                    </th>
                    <th
                      className={clsx(
                        "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-900"
                      )}
                    >
                      Plan
                    </th>
                    <th
                      className={clsx(
                        "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-900"
                      )}
                    >
                      Exercise
                    </th>
                    <th
                      className={clsx(
                        "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        theme === "dark" ? "text-white" : "text-gray-900"
                      )}
                    >
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
                                  ? "text-white"
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
                                    ? "bg-blue-900/40"
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
                                  {athleteRecords.map((rec) => (
                                    <div key={rec.id} className="mb-6">
                                      <div className="mb-2 text-base font-semibold flex items-center gap-2">
                                        <span>
                                          Exercise:{" "}
                                          <span>{rec.exercise_name}</span>
                                        </span>
                                      </div>
                                      <table className="min-w-[220px] text-sm mb-2">
                                        <thead>
                                          <tr>
                                            <th
                                              className={clsx(
                                                "text-left pr-4 font-semibold",
                                                theme === "dark"
                                                  ? "text-white"
                                                  : "text-gray-900"
                                              )}
                                            >
                                              Series
                                            </th>
                                            <th
                                              className={clsx(
                                                "text-left pr-4 font-semibold",
                                                theme === "dark"
                                                  ? "text-white"
                                                  : "text-gray-900"
                                              )}
                                            >
                                              Weight
                                            </th>
                                            <th
                                              className={clsx(
                                                "text-left font-semibold",
                                                theme === "dark"
                                                  ? "text-white"
                                                  : "text-gray-900"
                                              )}
                                            >
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
                                                className={clsx(
                                                  theme === "dark"
                                                    ? "text-gray-300"
                                                    : "text-gray-400"
                                                )}
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {Object.entries(recordsByAthlete).length === 0 ? (
                <div
                  className={clsx(
                    "text-center py-8 rounded-lg",
                    theme === "dark"
                      ? "text-slate-400 bg-slate-800/30"
                      : "text-gray-500 bg-gray-50"
                  )}
                >
                  No training records found for {selectedDate}
                </div>
              ) : (
                Object.entries(recordsByAthlete).map(
                  ([athleteId, athleteRecords]) => {
                    const athlete = athletes.find((a) => a.id === athleteId);
                    return (
                      <div
                        key={athleteId}
                        className={clsx(
                          "rounded-lg p-4 border",
                          theme === "dark"
                            ? "bg-slate-800/50 border-slate-700/50"
                            : "bg-white border-gray-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4
                            className={clsx(
                              "font-semibold text-lg",
                              theme === "dark" ? "text-white" : "text-gray-900"
                            )}
                          >
                            {athlete?.full_name || "Unknown Athlete"}
                          </h4>
                          <button
                            onClick={() =>
                              setOpenAthleteKey(
                                openAthleteKey === athleteId ? null : athleteId
                              )
                            }
                            className={clsx(
                              "p-1 rounded transition-colors",
                              theme === "dark"
                                ? "text-blue-300 hover:bg-blue-500/10"
                                : "text-blue-600 hover:bg-blue-50"
                            )}
                          >
                            {openAthleteKey === athleteId ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>

                        {openAthleteKey === athleteId && (
                          <div className="space-y-3">
                            {athleteRecords.map((rec) => (
                              <div
                                key={rec.id}
                                className={clsx(
                                  "p-3 rounded-lg border-l-4",
                                  rec.selected_plan === "A"
                                    ? theme === "dark"
                                      ? "border-l-blue-400 bg-blue-500/10"
                                      : "border-l-blue-500 bg-blue-50"
                                    : theme === "dark"
                                    ? "border-l-green-400 bg-green-500/10"
                                    : "border-l-green-500 bg-green-50"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={clsx(
                                        "px-2 py-1 rounded text-xs font-medium",
                                        rec.selected_plan === "A"
                                          ? theme === "dark"
                                            ? "bg-blue-500/20 text-blue-300"
                                            : "bg-blue-100 text-blue-800"
                                          : theme === "dark"
                                          ? "bg-green-500/20 text-green-300"
                                          : "bg-green-100 text-green-800"
                                      )}
                                    >
                                      Plan {rec.selected_plan}
                                    </span>
                                    <span
                                      className={clsx(
                                        "font-medium",
                                        theme === "dark"
                                          ? "text-white"
                                          : "text-gray-900"
                                      )}
                                    >
                                      {rec.exercise_name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setOpenRecordKey(
                                        openRecordKey === rec.id ? null : rec.id
                                      )
                                    }
                                    className={clsx(
                                      "text-xs px-2 py-1 rounded transition-colors",
                                      theme === "dark"
                                        ? "text-blue-300 hover:bg-blue-500/10"
                                        : "text-blue-600 hover:bg-blue-50"
                                    )}
                                  >
                                    {openRecordKey === rec.id ? "Hide" : "Show"}{" "}
                                    Series
                                  </button>
                                </div>

                                {openRecordKey === rec.id && (
                                  <div className="mt-3 space-y-2">
                                    {rec.series_data?.map(
                                      (series: any, seriesIndex: number) => (
                                        <div
                                          key={seriesIndex}
                                          className={clsx(
                                            "flex justify-between items-center py-2 px-3 rounded text-sm",
                                            theme === "dark"
                                              ? "bg-slate-700/50"
                                              : "bg-gray-100"
                                          )}
                                        >
                                          <span
                                            className={clsx(
                                              "font-medium",
                                              theme === "dark"
                                                ? "text-white"
                                                : "text-gray-900"
                                            )}
                                          >
                                            Set {seriesIndex + 1}
                                          </span>
                                          <div className="flex gap-4 text-xs">
                                            <span
                                              className={clsx(
                                                theme === "dark"
                                                  ? "text-slate-300"
                                                  : "text-gray-600"
                                              )}
                                            >
                                              {series.reps || "-"} reps
                                            </span>
                                            <span
                                              className={clsx(
                                                theme === "dark"
                                                  ? "text-slate-300"
                                                  : "text-gray-600"
                                              )}
                                            >
                                              {series.weight || "-"} kg
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={clsx(
              "rounded-2xl shadow-2xl max-w-md w-full p-6",
              theme === "dark"
                ? "bg-gray-900 border border-gray-700"
                : "bg-white border border-gray-200"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={clsx(
                  "p-2 rounded-full",
                  theme === "dark"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-red-100 text-red-600"
                )}
              >
                <Trash2 className="h-5 w-5" />
              </div>
              <h3
                className={clsx(
                  "text-lg font-semibold",
                  theme === "dark" ? "text-white" : "text-gray-900"
                )}
              >
                Delete Program
              </h3>
            </div>

            <p
              className={clsx(
                "mb-6 text-sm",
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              )}
            >
              Are you sure you want to delete this program? This action cannot
              be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteProgram}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                  theme === "dark"
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProgram}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                  theme === "dark"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                )}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
