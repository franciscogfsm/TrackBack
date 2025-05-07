import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/database.types";
import ProfilePicture from "./ProfilePicture";
import clsx from "clsx";
import { Trophy } from "lucide-react";

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
}

interface TeamPersonalBestsProps {
  currentAthlete: Profile;
  managerId: string;
}

export default function TeamPersonalBests({
  currentAthlete,
  managerId,
}: TeamPersonalBestsProps) {
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [athletePoints, setAthletePoints] = useState<AthletePoints[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      // Fetch all athletes under this manager
      const { data: athleteData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("manager_id", managerId)
        .eq("role", "athlete");
      if (!isMounted) return;
      setAthletes(
        (athleteData || []).map((a: any) => ({
          id: a.id,
          full_name: a.full_name || "Unnamed Athlete",
          avatar_url: a.avatar_url || "",
          email: "",
          role: "athlete",
          manager_id: managerId,
          created_at: "",
          updated_at: "",
        }))
      );
      // Fetch all personal records for these athletes
      const athleteIds = (athleteData || []).map((a: any) => a.id);
      if (athleteIds.length > 0) {
        const { data: recordData } = await supabase
          .from("personal_records")
          .select("id, athlete_id, exercise, weight, record_date, video_url")
          .in("athlete_id", athleteIds);
        if (!isMounted) return;
        setRecords(recordData || []);
        // Set default exercise
        if (!selectedExercise && recordData && recordData.length > 0) {
          setSelectedExercise(recordData[0].exercise);
        }
      }
      setLoading(false);
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [managerId]);

  // Calculate points for each athlete
  useEffect(() => {
    if (records.length === 0) return;

    // Get unique exercises
    const exercises = Array.from(new Set(records.map((r) => r.exercise)));

    // Initialize points for each athlete
    const pointsMap = new Map<string, AthletePoints>();
    athletes.forEach((athlete) => {
      pointsMap.set(athlete.id, {
        id: athlete.id,
        full_name: athlete.full_name,
        avatar_url: athlete.avatar_url || "",
        total_points: 0,
      });
    });

    // Calculate points for each exercise
    exercises.forEach((exercise) => {
      const exerciseRecords = records
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
  }, [records, athletes]);

  // Get all unique exercises
  const exercises = Array.from(new Set(records.map((r) => r.exercise)));

  // For the selected exercise, get each athlete's best (highest weight) record
  const leaderboard = athletes
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
      return best
        ? {
            ...best,
            athlete,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.weight - a.weight);

  // Compute leaderboard with competition ranking (ties get same place, e.g., 1,1,3)
  let lastWeight: number | null = null;
  let lastPlace = 0;
  let countAtPlace = 0;
  const leaderboardWithPlace = leaderboard.map((rec: any, idx: number) => {
    if (rec.weight !== lastWeight) {
      lastPlace = idx + 1;
      countAtPlace = 1;
    } else {
      countAtPlace++;
    }
    lastWeight = rec.weight;
    // The place is the index of the first occurrence of this weight + 1
    let place = leaderboard.findIndex((r: any) => r.weight === rec.weight) + 1;
    return { ...rec, place };
  });

  return (
    <div className="space-y-8">
      {/* Exercise-specific leaderboard */}
      <div className="bg-white/90 rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2 animate-fade-in">
            <h3 className="text-lg font-semibold text-yellow-700">
              Team Leaderboard
            </h3>
            <span className="text-xl align-middle" role="img" aria-label="fire">
              🔥
            </span>
          </div>
          <label
            className="block text-xs text-gray-500 mb-2"
            htmlFor="team-exercise-select"
          >
            Choose Exercise:
          </label>
          <select
            id="team-exercise-select"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="px-4 py-2 rounded-lg border text-base shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-yellow-50 hover:bg-yellow-100 pr-8 text-center font-medium"
            style={{ minWidth: 120 }}
          >
            {exercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-8">
          {/* See Overall Points Button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => {
                const el = document.getElementById(
                  "overall-points-leaderboard"
                );
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 text-white font-bold shadow-lg hover:bg-yellow-500 transition-all text-sm animate-bounce"
              style={{ zIndex: 10 }}
            >
              <span className="text-lg">🏆</span> See Overall Points
            </button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              Loading leaderboard...
            </div>
          ) : leaderboardWithPlace.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              No personal bests found for this exercise.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto rounded-2xl shadow border border-gray-100 bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Place
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Athlete
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Weight (kg)
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Video
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {leaderboardWithPlace.map((rec: any) => {
                      let placeIcon = "";
                      if (rec.place === 1) placeIcon = "🥇";
                      else if (rec.place === 2) placeIcon = "🥈";
                      else if (rec.place === 3) placeIcon = "🥉";
                      return (
                        <tr
                          key={rec.id}
                          className={clsx(
                            "transition-colors",
                            rec.athlete_id === currentAthlete.id
                              ? "bg-yellow-100/60 font-bold"
                              : "hover:bg-yellow-50/40",
                            rec.place === 1
                              ? "ring-2 ring-yellow-400/80 bg-yellow-50"
                              : ""
                          )}
                        >
                          <td className="px-4 py-3 font-bold text-lg text-center">
                            {placeIcon ? (
                              <span
                                title={`${rec.place} place`}
                                className="mr-1"
                              >
                                {placeIcon}
                              </span>
                            ) : (
                              <span className="text-gray-500">{rec.place}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 flex items-center gap-2">
                            <ProfilePicture
                              profile={{
                                ...rec.athlete,
                                avatar_url: rec.athlete.avatar_url || "",
                                full_name:
                                  rec.athlete.full_name || "Unnamed Athlete",
                              }}
                              size="sm"
                            />
                            <span>
                              {rec.athlete.full_name || "Unnamed Athlete"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-4 items-center">
                              <span className="flex items-baseline">
                                <span
                                  className="text-yellow-600 font-extrabold text-lg sm:text-xl drop-shadow-sm"
                                  style={{ letterSpacing: "-1px" }}
                                >
                                  {rec.weight}
                                </span>
                                <span className="ml-1 text-blue-500 font-bold text-xs sm:text-sm">
                                  kg
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {new Date(rec.record_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {rec.video_url ? (
                              <a
                                href={rec.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition"
                              >
                                View Video
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                No video
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile Card List */}
              <div className="block sm:hidden space-y-2">
                {leaderboardWithPlace.map((rec: any) => {
                  let placeIcon = "";
                  if (rec.place === 1) placeIcon = "🥇";
                  else if (rec.place === 2) placeIcon = "🥈";
                  else if (rec.place === 3) placeIcon = "🥉";
                  return (
                    <div
                      key={rec.id}
                      className={clsx(
                        "rounded-xl bg-white border border-gray-100 shadow-sm px-2 py-1 flex flex-col gap-1 w-full",
                        rec.athlete_id === currentAthlete.id
                          ? "border-2 border-yellow-400/80 bg-yellow-50/60"
                          : ""
                      )}
                    >
                      {/* First row: Place, Avatar, Name */}
                      <div className="flex items-center gap-2 mb-0.5 pl-1">
                        <span
                          className={clsx(
                            "flex items-center justify-center w-7 h-7 rounded-full font-bold text-base",
                            rec.place === 1
                              ? "bg-yellow-200 text-yellow-700"
                              : rec.place === 2
                              ? "bg-gray-200 text-gray-700"
                              : rec.place === 3
                              ? "bg-orange-200 text-orange-700"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {placeIcon || rec.place}
                        </span>
                        <ProfilePicture
                          profile={{
                            ...rec.athlete,
                            avatar_url: rec.athlete.avatar_url || "",
                            full_name:
                              rec.athlete.full_name || "Unnamed Athlete",
                          }}
                          size="sm"
                        />
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {rec.athlete.full_name || "Unnamed Athlete"}
                        </span>
                      </div>
                      {/* Second row: Weight, Date, Video Button (right) */}
                      <div
                        className="flex items-center justify-between w-full pl-10 pr-2 text-xs text-gray-700 mb-0.5"
                        style={{ height: "2.5rem" }}
                      >
                        <div className="flex gap-4 items-center">
                          <span className="flex items-baseline">
                            <span
                              className="text-yellow-600 font-extrabold text-lg sm:text-xl drop-shadow-sm"
                              style={{ letterSpacing: "-1px" }}
                            >
                              {rec.weight}
                            </span>
                            <span className="ml-1 text-blue-500 font-bold text-xs sm:text-sm">
                              kg
                            </span>
                          </span>
                        </div>
                        <span className="text-gray-400">
                          {new Date(rec.record_date).toLocaleDateString()}
                        </span>
                        {rec.video_url && (
                          <a
                            href={rec.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 flex items-center justify-center"
                            aria-label="View Video"
                            title="View Video"
                          >
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 shadow transition-transform duration-150 hover:scale-105">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                style={{ display: "block" }}
                              >
                                <polygon points="7,5 15,10 7,15" />
                              </svg>
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overall Points Leaderboard (Mobile-friendly) */}
      <div
        id="overall-points-leaderboard"
        className="bg-white/90 rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Overall Points Leaderboard
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-2 mb-1 w-full max-w-full">
            <span className="font-bold text-yellow-700 text-sm mb-1 sm:mb-0 sm:mr-2 text-center w-full sm:w-auto">
              How Points Work:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
              <span className="flex items-center gap-1">
                <span className="text-xl">🥇</span>
                <span className="font-bold text-yellow-700">3 pts</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-xl">🥈</span>
                <span className="font-bold text-gray-700">2 pts</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-xl">🥉</span>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {athletePoints.map((athlete, index) => (
                <tr
                  key={athlete.id}
                  className={
                    athlete.id === currentAthlete.id ? "bg-yellow-50" : ""
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 flex-shrink-0">
                        <img
                          className="h-8 w-8 rounded-full"
                          src={
                            athlete.avatar_url ||
                            "https://via.placeholder.com/32"
                          }
                          alt=""
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {athlete.full_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-bold text-yellow-600">
                      {athlete.total_points} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile Card List */}
        <div className="block sm:hidden space-y-2 p-2">
          {athletePoints.map((athlete, index) => (
            <div
              key={athlete.id}
              className={clsx(
                "rounded-xl bg-white border border-gray-100 shadow-sm px-2 py-2 flex items-center gap-2",
                athlete.id === currentAthlete.id
                  ? "border-2 border-yellow-400/80 bg-yellow-50/60"
                  : ""
              )}
            >
              <span className="text-base font-bold min-w-[22px] text-center text-gray-700">
                {index + 1}
              </span>
              <img
                className="h-7 w-7 rounded-full"
                src={athlete.avatar_url || "https://via.placeholder.com/32"}
                alt=""
              />
              <span className="font-semibold text-gray-900 text-sm truncate flex-1">
                {athlete.full_name}
              </span>
              <span className="font-bold text-yellow-600 text-base text-right whitespace-nowrap">
                {athlete.total_points} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
