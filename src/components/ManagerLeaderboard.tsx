import { useState, useEffect, useMemo, useCallback, memo } from "react";
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

function ManagerLeaderboard({
  managerId,
  refreshKey,
}: ManagerLeaderboardProps) {
  const [groups, setGroups] = useState<AthleteGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Memoized calculations for better performance
  const groupsMap = useMemo(() => {
    return new Map(groups.map((g) => [g.id, g]));
  }, [groups]);

  const filteredAthletes = useMemo(() => {
    if (selectedGroupId === "all") {
      return athletes;
    } else if (selectedGroupId === "ungrouped") {
      return athletes.filter((a) => !a.group_id);
    } else {
      return athletes.filter((a) => a.group_id === selectedGroupId);
    }
  }, [selectedGroupId, athletes]);

  const filteredRecords = useMemo(() => {
    const athleteIds = filteredAthletes.map((a) => a.id);
    return records.filter((r) => athleteIds.includes(r.athlete_id));
  }, [filteredAthletes, records]);

  const exercises = useMemo(() => {
    return Array.from(new Set(filteredRecords.map((r) => r.exercise)));
  }, [filteredRecords]);

  const athletePoints = useMemo(() => {
    if (filteredRecords.length === 0) return [];

    const exercisesList = Array.from(
      new Set(filteredRecords.map((r) => r.exercise))
    );

    // Initialize points for each athlete
    const pointsMap = new Map<string, AthletePoints>();
    filteredAthletes.forEach((athlete) => {
      const group = groupsMap.get(athlete.group_id || "");
      pointsMap.set(athlete.id, {
        id: athlete.id,
        full_name: athlete.full_name,
        avatar_url: athlete.avatar_url || "",
        total_points: 0,
        group_name: group?.name || "Ungrouped",
      });
    });

    // Calculate points for each exercise
    exercisesList.forEach((exercise) => {
      const exerciseRecords = filteredRecords
        .filter((r) => r.exercise === exercise)
        .sort((a, b) => b.weight - a.weight);

      if (exerciseRecords.length === 0) return;

      let currentRank = 1;
      let currentWeight = exerciseRecords[0].weight;
      let points = 3;

      exerciseRecords.forEach((record) => {
        if (record.weight !== currentWeight) {
          currentRank++;
          points = Math.max(4 - currentRank, 0);
          currentWeight = record.weight;
        }

        const athletePoint = pointsMap.get(record.athlete_id);
        if (athletePoint) {
          athletePoint.total_points += points;
        }
      });
    });

    return Array.from(pointsMap.values()).sort(
      (a, b) => b.total_points - a.total_points
    );
  }, [filteredAthletes, filteredRecords, groupsMap]);

  const exerciseLeaderboard = useMemo(() => {
    if (!selectedExercise) return [];

    const leaderboard = filteredAthletes
      .map((athlete) => {
        const athleteRecords = filteredRecords.filter(
          (r) => r.athlete_id === athlete.id && r.exercise === selectedExercise
        );
        if (athleteRecords.length === 0) return null;

        const best = athleteRecords.reduce(
          (max, rec) => (rec.weight > max.weight ? rec : max),
          athleteRecords[0]
        );

        const group = groupsMap.get(athlete.group_id || "");
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

    return leaderboard.map((rec: any, idx: number) => ({
      ...rec,
      place: idx + 1,
    }));
  }, [selectedExercise, filteredAthletes, filteredRecords, groupsMap]);

  const getGroupName = useCallback(
    (groupId: string) => {
      if (groupId === "all") return "All Groups";
      if (groupId === "ungrouped") return "Ungrouped Athletes";
      return groupsMap.get(groupId)?.name || "Unknown Group";
    },
    [groupsMap]
  );

  const getGroupAthleteCount = useCallback(
    (groupId: string) => {
      if (groupId === "all") return athletes.length;
      if (groupId === "ungrouped")
        return athletes.filter((a) => !a.group_id).length;
      return athletes.filter((a) => a.group_id === groupId).length;
    },
    [athletes]
  );

  const fetchData = useCallback(async () => {
    if (!managerId) return;

    setLoading(true);

    try {
      const [groupsResult, athletesResult] = await Promise.all([
        supabase
          .from("athlete_groups")
          .select("*")
          .eq("manager_id", managerId)
          .order("name", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, group_id")
          .eq("manager_id", managerId)
          .eq("role", "athlete"),
      ]);

      const { data: groupsData } = groupsResult;
      const { data: athletesData } = athletesResult;

      if (athletesData) {
        const formattedAthletes = athletesData.map((a) => ({
          ...a,
          email: "",
          role: "athlete" as const,
          manager_id: managerId,
          created_at: "",
          updated_at: "",
        }));
        setAthletes(formattedAthletes);

        const athleteIds = athletesData.map((a) => a.id);
        if (athleteIds.length > 0) {
          const { data: recordsData } = await supabase
            .from("personal_records")
            .select("id, athlete_id, exercise, weight, record_date, video_url")
            .in("athlete_id", athleteIds);

          if (recordsData) {
            setRecords(recordsData);
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
    } finally {
      setLoading(false);
    }
  }, [managerId, selectedExercise]);

  // Optimized group selection handler with debouncing
  const handleGroupChange = useCallback((newGroupId: string) => {
    setSelectedGroupId(newGroupId);
  }, []);

  // Optimized exercise selection handler
  const handleExerciseChange = useCallback((newExercise: string) => {
    setSelectedExercise(newExercise);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

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
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="px-4 py-2 pr-10 rounded-lg border text-sm shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white hover:bg-yellow-50 min-w-[200px] max-w-[300px] truncate appearance-none bg-no-repeat bg-right bg-[length:16px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')]"
                  style={{ backgroundPosition: "right 12px center" }}
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
                    onChange={(e) => handleExerciseChange(e.target.value)}
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
                        <tr
                          key={rec.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
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
                                className="h-10 w-10 rounded-full object-cover transition-all duration-200"
                                src={
                                  rec.athlete.avatar_url ||
                                  "https://via.placeholder.com/40"
                                }
                                alt={rec.athlete.full_name}
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://via.placeholder.com/40";
                                }}
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
                      className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 transition-all duration-150 hover:shadow-md"
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
                            className="h-8 w-8 rounded-full object-cover transition-all duration-200"
                            src={
                              rec.athlete.avatar_url ||
                              "https://via.placeholder.com/32"
                            }
                            alt={rec.athlete.full_name}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/32";
                            }}
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
                  <tr
                    key={athlete.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
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
                          className="h-10 w-10 rounded-full object-cover transition-all duration-200"
                          src={
                            athlete.avatar_url ||
                            "https://via.placeholder.com/40"
                          }
                          alt={athlete.full_name}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/40";
                          }}
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
                className="rounded-xl bg-white border border-gray-100 shadow-sm p-3 flex items-center gap-3 transition-all duration-150 hover:shadow-md"
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
                  className="h-8 w-8 rounded-full object-cover transition-all duration-200"
                  src={athlete.avatar_url || "https://via.placeholder.com/32"}
                  alt={athlete.full_name}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/32";
                  }}
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

export default memo(ManagerLeaderboard);
