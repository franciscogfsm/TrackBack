import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Profile, AthleteGroup } from "../lib/database.types";
import clsx from "clsx";

interface PersonalRecord {
  id: string;
  athlete_id: string;
  exercise: string;
  weight: number;
  record_date: string;
  video_url: string;
}

interface AthletePoints {
  id: string;
  full_name: string;
  avatar_url: string;
  total_points: number;
  group_name?: string;
}

interface ManagerLeaderboardProps {
  managerId: string;
  refreshKey?: number;
}

export default function ManagerLeaderboard({
  managerId,
  refreshKey,
}: ManagerLeaderboardProps) {
  const [groups, setGroups] = useState<AthleteGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [athletePoints, setAthletePoints] = useState<AthletePoints[]>([]);

  useEffect(() => {
    fetchData();
  }, [managerId, refreshKey]);

  useEffect(() => {
    if (groups.length > 0 && selectedGroupId === "all") {
      // Set default to the group with the most athletes
      const groupWithMostAthletes = groups.reduce((prev, current) => {
        const prevCount = athletes.filter((a) => a.group_id === prev.id).length;
        const currentCount = athletes.filter(
          (a) => a.group_id === current.id
        ).length;
        return currentCount > prevCount ? current : prev;
      });
      setSelectedGroupId(groupWithMostAthletes.id);
    }
  }, [groups, athletes]);

  useEffect(() => {
    filterAthletesByGroup();
  }, [selectedGroupId, athletes, records]);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch groups
      const { data: groupsData } = await supabase
        .from("athlete_groups")
        .select("*")
        .eq("manager_id", managerId)
        .order("name", { ascending: true });

      // Fetch all athletes under this manager
      const { data: athletesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, group_id")
        .eq("manager_id", managerId)
        .eq("role", "athlete");

      if (athletesData) {
        setAthletes(
          athletesData.map((a) => ({
            ...a,
            email: "",
            role: "athlete" as const,
            manager_id: managerId,
            created_at: "",
            updated_at: "",
          }))
        );

        // Fetch personal records for all athletes
        const athleteIds = athletesData.map((a) => a.id);
        if (athleteIds.length > 0) {
          const { data: recordsData } = await supabase
            .from("personal_records")
            .select("id, athlete_id, exercise, weight, record_date, video_url")
            .in("athlete_id", athleteIds);

          if (recordsData) {
            setRecords(recordsData);
            // Set default exercise
            if (!selectedExercise && recordsData.length > 0) {
              setSelectedExercise(recordsData[0].exercise);
            }
          }
        }
      }

      if (groupsData) {
        setGroups(groupsData);
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    }

    setLoading(false);
  };

  const filterAthletesByGroup = () => {
    let filteredAthletes: Profile[];

    if (selectedGroupId === "all") {
      filteredAthletes = athletes;
    } else if (selectedGroupId === "ungrouped") {
      filteredAthletes = athletes.filter((a) => !a.group_id);
    } else {
      filteredAthletes = athletes.filter((a) => a.group_id === selectedGroupId);
    }

    // Calculate points for filtered athletes
    calculatePoints(filteredAthletes);
  };

  const calculatePoints = (filteredAthletes: Profile[]) => {
    if (records.length === 0) return;

    // Get athlete IDs for filtering
    const athleteIds = filteredAthletes.map((a) => a.id);
    const filteredRecords = records.filter((r) =>
      athleteIds.includes(r.athlete_id)
    );

    // Get unique exercises
    const exercises = Array.from(
      new Set(filteredRecords.map((r) => r.exercise))
    );

    // Initialize points for each athlete
    const pointsMap = new Map<string, AthletePoints>();
    filteredAthletes.forEach((athlete) => {
      const group = groups.find((g) => g.id === athlete.group_id);
      pointsMap.set(athlete.id, {
        id: athlete.id,
        full_name: athlete.full_name,
        avatar_url: athlete.avatar_url || "",
        total_points: 0,
        group_name: group?.name || "Ungrouped",
      });
    });

    // Calculate points for each exercise
    exercises.forEach((exercise) => {
      const exerciseRecords = filteredRecords
        .filter((r) => r.exercise === exercise)
        .sort((a, b) => b.weight - a.weight);

      if (exerciseRecords.length === 0) return;

      // Assign points based on ranking (1st = 3, 2nd = 2, 3rd = 1)
      let currentRank = 1;
      let currentWeight = exerciseRecords[0].weight;
      let points = 3;

      exerciseRecords.forEach((record) => {
        if (record.weight !== currentWeight) {
          currentRank++;
          points = Math.max(4 - currentRank, 0); // 3,2,1,0 points
          currentWeight = record.weight;
        }

        const athletePoints = pointsMap.get(record.athlete_id);
        if (athletePoints) {
          athletePoints.total_points += points;
        }
      });
    });

    // Convert to array and sort by total points
    const sortedPoints = Array.from(pointsMap.values()).sort(
      (a, b) => b.total_points - a.total_points
    );

    setAthletePoints(sortedPoints);
  };

  // Get all unique exercises from current filtered records
  const getExercises = () => {
    let filteredAthletes: Profile[];

    if (selectedGroupId === "all") {
      filteredAthletes = athletes;
    } else if (selectedGroupId === "ungrouped") {
      filteredAthletes = athletes.filter((a) => !a.group_id);
    } else {
      filteredAthletes = athletes.filter((a) => a.group_id === selectedGroupId);
    }

    const athleteIds = filteredAthletes.map((a) => a.id);
    const filteredRecords = records.filter((r) =>
      athleteIds.includes(r.athlete_id)
    );
    return Array.from(new Set(filteredRecords.map((r) => r.exercise)));
  };

  // Get leaderboard for selected exercise
  const getExerciseLeaderboard = () => {
    if (!selectedExercise) return [];

    let filteredAthletes: Profile[];

    if (selectedGroupId === "all") {
      filteredAthletes = athletes;
    } else if (selectedGroupId === "ungrouped") {
      filteredAthletes = athletes.filter((a) => !a.group_id);
    } else {
      filteredAthletes = athletes.filter((a) => a.group_id === selectedGroupId);
    }

    const leaderboard = filteredAthletes
      .map((athlete) => {
        // Find all records for this athlete and exercise
        const athleteRecords = records.filter(
          (r) => r.athlete_id === athlete.id && r.exercise === selectedExercise
        );
        if (athleteRecords.length === 0) return null;

        // Find the best (highest weight) record
        const best = athleteRecords.reduce(
          (max, rec) => (rec.weight > max.weight ? rec : max),
          athleteRecords[0]
        );

        const group = groups.find((g) => g.id === athlete.group_id);
        return best
          ? {
              ...best,
              athlete: {
                ...athlete,
                group_name: group?.name || "Ungrouped",
              },
            }
          : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.weight - a.weight);

    // Add ranking
    return leaderboard.map((rec: any, idx: number) => ({
      ...rec,
      place: idx + 1,
    }));
  };

  const exercises = getExercises();
  const exerciseLeaderboard = getExerciseLeaderboard();

  const getGroupName = (groupId: string) => {
    if (groupId === "all") return "All Groups";
    if (groupId === "ungrouped") return "Ungrouped Athletes";
    return groups.find((g) => g.id === groupId)?.name || "Unknown Group";
  };

  const getGroupAthleteCount = (groupId: string) => {
    if (groupId === "all") return athletes.length;
    if (groupId === "ungrouped")
      return athletes.filter((a) => !a.group_id).length;
    return athletes.filter((a) => a.group_id === groupId).length;
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500">
        Loading leaderboard...
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No athletes found. Invite athletes to see the leaderboard.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Group Selection */}
      <div className="bg-white/90 rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-yellow-700 mb-2">
                Manager Leaderboard 🏆
              </h3>
              <p className="text-sm text-gray-600">
                View performance across all groups or select a specific group
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Select Group:
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="px-4 py-2 rounded-lg border text-sm shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white hover:bg-yellow-50 min-w-[200px]"
                >
                  <option value="all">All Groups</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({getGroupAthleteCount(group.id)} athletes)
                    </option>
                  ))}
                  {athletes.some((a) => !a.group_id) && (
                    <option value="ungrouped">
                      Ungrouped ({getGroupAthleteCount("ungrouped")} athletes)
                    </option>
                  )}
                </select>
              </div>
              {exercises.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Exercise:
                  </label>
                  <select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="px-4 py-2 rounded-lg border text-sm shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white hover:bg-yellow-50 min-w-[150px]"
                  >
                    {exercises.map((exercise) => (
                      <option key={exercise} value={exercise}>
                        {exercise}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Exercise Leaderboard */}
        {selectedExercise && (
          <div className="p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">
              {selectedExercise} - {getGroupName(selectedGroupId)}
            </h4>
            {exerciseLeaderboard.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                No personal bests found for this exercise in this group.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl shadow border border-gray-100 bg-white">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Athlete
                        </th>
                        {selectedGroupId === "all" && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Group
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Weight (kg)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {exerciseLeaderboard.map((rec: any) => (
                        <tr key={rec.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span
                                className={clsx(
                                  "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                                  rec.place === 1
                                    ? "bg-yellow-100 text-yellow-800"
                                    : rec.place === 2
                                    ? "bg-gray-100 text-gray-800"
                                    : rec.place === 3
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-blue-100 text-blue-800"
                                )}
                              >
                                {rec.place}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                className="h-10 w-10 rounded-full"
                                src={
                                  rec.athlete.avatar_url ||
                                  "https://via.placeholder.com/40"
                                }
                                alt=""
                              />
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {rec.athlete.full_name}
                                </div>
                              </div>
                            </div>
                          </td>
                          {selectedGroupId === "all" && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {rec.athlete.group_name}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {rec.weight} kg
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(rec.record_date).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="block sm:hidden space-y-3">
                  {exerciseLeaderboard.map((rec: any) => (
                    <div
                      key={rec.id}
                      className="rounded-xl bg-white border border-gray-100 shadow-sm p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={clsx(
                              "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                              rec.place === 1
                                ? "bg-yellow-100 text-yellow-800"
                                : rec.place === 2
                                ? "bg-gray-100 text-gray-800"
                                : rec.place === 3
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                            )}
                          >
                            {rec.place}
                          </span>
                          <img
                            className="h-8 w-8 rounded-full"
                            src={
                              rec.athlete.avatar_url ||
                              "https://via.placeholder.com/32"
                            }
                            alt=""
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {rec.athlete.full_name}
                            </div>
                            {selectedGroupId === "all" && (
                              <div className="text-xs text-gray-500">
                                {rec.athlete.group_name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {rec.weight} kg
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(rec.record_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Overall Points Leaderboard */}
      {athletePoints.length > 0 && (
        <div className="bg-white/90 rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Overall Points - {getGroupName(selectedGroupId)}
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4">
              <span className="font-bold text-yellow-700 text-sm">
                How Points Work:
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="text-lg">🥇</span>
                  <span className="font-bold text-yellow-700">3 pts</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-lg">🥈</span>
                  <span className="font-bold text-gray-700">2 pts</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-lg">🥉</span>
                  <span className="font-bold text-orange-700">1 pt</span>
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Athlete
                  </th>
                  {selectedGroupId === "all" && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Group
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {athletePoints.map((athlete, index) => (
                  <tr key={athlete.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={clsx(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                          index === 0
                            ? "bg-yellow-100 text-yellow-800"
                            : index === 1
                            ? "bg-gray-100 text-gray-800"
                            : index === 2
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        )}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={
                            athlete.avatar_url ||
                            "https://via.placeholder.com/40"
                          }
                          alt=""
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {athlete.full_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    {selectedGroupId === "all" && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {athlete.group_name}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-yellow-600">
                        {athlete.total_points} pts
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block sm:hidden space-y-2 p-4">
            {athletePoints.map((athlete, index) => (
              <div
                key={athlete.id}
                className="rounded-xl bg-white border border-gray-100 shadow-sm p-3 flex items-center gap-3"
              >
                <span
                  className={clsx(
                    "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                    index === 0
                      ? "bg-yellow-100 text-yellow-800"
                      : index === 1
                      ? "bg-gray-100 text-gray-800"
                      : index === 2
                      ? "bg-orange-100 text-orange-800"
                      : "bg-blue-100 text-blue-800"
                  )}
                >
                  {index + 1}
                </span>
                <img
                  className="h-8 w-8 rounded-full"
                  src={athlete.avatar_url || "https://via.placeholder.com/32"}
                  alt=""
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {athlete.full_name}
                  </div>
                  {selectedGroupId === "all" && (
                    <div className="text-xs text-gray-500">
                      {athlete.group_name}
                    </div>
                  )}
                </div>
                <div className="text-sm font-bold text-yellow-600">
                  {athlete.total_points} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
