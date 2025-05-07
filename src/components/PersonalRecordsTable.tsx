import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "./ThemeProvider";
import clsx from "clsx";

interface PersonalRecord {
  id: string;
  exercise: string;
  weight: number;
  record_date: string;
  video_url: string;
  notes: string;
}

interface PersonalRecordsTableProps {
  athleteId: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  form: {
    exercise: string;
    weight: number;
    record_date: string;
    video_url: string;
    notes: string;
  };
  setForm: (
    form:
      | {
          exercise: string;
          weight: number;
          record_date: string;
          video_url: string;
          notes: string;
        }
      | ((prev: {
          exercise: string;
          weight: number;
          record_date: string;
          video_url: string;
          notes: string;
        }) => {
          exercise: string;
          weight: number;
          record_date: string;
          video_url: string;
          notes: string;
        })
  ) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  canEdit?: boolean;
  refreshKey?: number;
}

const initialForm = {
  exercise: "",
  weight: 0,
  record_date: "",
  video_url: "",
  notes: "",
};

const ALLOWED_EXERCISES = [
  "Bench Press",
  "Row",
  "Deadlift",
  "Power Clean",
  "Squat",
];

export default function PersonalRecordsTable({
  athleteId,
  showModal,
  setShowModal,
  form,
  setForm,
  editingId,
  setEditingId,
  canEdit = false,
  refreshKey,
}: PersonalRecordsTableProps) {
  const { theme } = useTheme();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("personal_records")
      .select("id, exercise, weight, record_date, video_url, notes")
      .eq("athlete_id", athleteId)
      .order("exercise", { ascending: true })
      .order("record_date", { ascending: false });
    if (!error && data) setRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!athleteId || athleteId === "" || athleteId === "all") return;
    fetchRecords();
    // eslint-disable-next-line
  }, [athleteId, refreshKey]);

  // Listen for external add PR button event
  useEffect(() => {
    const handler = () => {
      setForm(initialForm);
      setEditingId(null);
      setShowModal(true);
    };
    const btn = document.querySelector("[data-add-pr-btn]");
    if (btn) btn.addEventListener("click", handler);
    return () => {
      if (btn) btn.removeEventListener("click", handler);
    };
  }, []);

  const openEditModal = (rec: PersonalRecord) => {
    setForm({
      exercise: rec.exercise,
      weight: rec.weight,
      record_date: rec.record_date,
      video_url: rec.video_url || "",
      notes: rec.notes || "",
    });
    setEditingId(rec.id);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId) {
      await handleDelete(pendingDeleteId);
      setPendingDeleteId(null);
      setShowDeleteModal(false);
    }
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
    setShowDeleteModal(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      // Fetch the record to get the video_url
      const { data: record, error: fetchError } = await supabase
        .from("personal_records")
        .select("video_url")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;
      // If there is a video_url, remove the file from storage
      if (record && record.video_url) {
        try {
          const bucketName = "personal-records-videos";
          const marker = `/object/public/${bucketName}/`;
          const idx = record.video_url.indexOf(marker);
          if (idx !== -1) {
            const filePath = record.video_url.substring(idx + marker.length);
            console.log("Attempting to delete file:", filePath);
            const { data: removeData, error: removeError } =
              await supabase.storage.from(bucketName).remove([filePath]);
            console.log("Remove response:", removeData, removeError);
            if (removeError) {
              setError(
                "Error deleting video from storage: " + removeError.message
              );
            }
          }
        } catch (e) {
          setError(
            "Error deleting video from storage: " +
              (e instanceof Error ? e.message : String(e))
          );
          console.error("Error deleting video from storage:", e);
        }
      }
      // Now delete the record
      const { error } = await supabase
        .from("personal_records")
        .delete()
        .eq("id", id);
      if (error) setError("Error deleting record.");
      else await fetchRecords();
    } catch (err: any) {
      setError(err.message || "Error deleting record.");
    }
    setDeletingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.exercise || !form.weight || !form.record_date) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.video_url) {
      setError("Please upload a video before adding the record.");
      return;
    }
    if (editingId) {
      // Update
      const { error } = await supabase
        .from("personal_records")
        .update({ ...form })
        .eq("id", editingId);
      if (error) setError("Error updating record.");
    } else {
      // Insert
      const { error } = await supabase
        .from("personal_records")
        .insert({ ...form, athlete_id: athleteId });
      if (error) setError("Error adding record.");
    }
    setShowModal(false);
    setEditingId(null);
    setForm({
      exercise: "",
      weight: 0,
      record_date: "",
      video_url: "",
      notes: "",
    });
    await fetchRecords();
  };

  // Video upload handler
  const handleVideoUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${athleteId}/${Date.now()}.${fileExt}`;
      // Supabase Storage upload
      const { data, error } = await supabase.storage
        .from("personal-records-videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw error;
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("personal-records-videos")
        .getPublicUrl(filePath);
      if (!publicUrlData?.publicUrl)
        throw new Error("Failed to get public URL");
      setForm(
        (prev: {
          exercise: string;
          weight: number;
          record_date: string;
          video_url: string;
          notes: string;
        }) => ({
          ...prev,
          video_url: publicUrlData.publicUrl,
        })
      );
      // Show success message (keep until modal closes or record is added)
      setSuccessMessage(
        "Video uploaded successfully! You can now add the record."
      );
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // When modal closes or record is added, clear the success message
  useEffect(() => {
    if (!showModal) setSuccessMessage(null);
  }, [showModal]);

  if (loading) {
    return <div className="py-8 text-center text-gray-500"></div>;
  }

  return (
    <div className="mt-8">
      {/* Success Message (removed from here, only in modal now) */}
      {/* Desktop Table (only show on sm+ screens) */}
      <div className={clsx(canEdit ? "hidden sm:block" : "hidden sm:block")}>
        <div
          className={clsx(
            "rounded-2xl overflow-x-auto w-full max-w-full shadow-sm p-0 sm:p-0 md:p-0 lg:p-0",
            theme === "dark"
              ? "bg-slate-800/50 ring-1 ring-slate-700/50"
              : "bg-white border border-gray-100"
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <table className="min-w-full divide-y divide-gray-200 text-sm sm:text-base">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                  EXERCISE
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                  LOAD (KG)
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                  RECORD DATE
                </th>
                {canEdit && (
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                    ACTIONS
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 4 : 3}
                    className="py-8 text-center text-gray-400 text-sm bg-white rounded-2xl shadow-sm border border-gray-100"
                  >
                    No personal best found.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-yellow-50/40 transition-colors"
                  >
                    <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {rec.exercise}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {rec.weight}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(rec.record_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      {rec.video_url && (
                        <a
                          href={rec.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mr-2 px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition"
                        >
                          View Video
                        </a>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="text-red-500 hover:text-red-700 font-medium text-xs sm:text-sm px-2 py-1 rounded-lg transition"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Mobile Card List (always show on mobile, only show on sm- screens for athletes/managers) */}
      <div className={clsx("block sm:hidden")}>
        {records.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm bg-white rounded-2xl shadow-sm border border-gray-100">
            No personal best found.
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => (
              <div
                key={rec.id}
                className={clsx(
                  "rounded-xl bg-white border border-gray-100 shadow-sm p-4 flex flex-col gap-2"
                )}
              >
                <div className="font-semibold text-gray-900 text-base mb-1">
                  {rec.exercise}
                </div>
                <div className="flex items-center justify-between gap-2 text-sm text-gray-700 mb-2">
                  <div className="flex gap-4">
                    <span>
                      <span className="font-medium">Load:</span> {rec.weight} kg
                    </span>
                    <span>
                      <span className="font-medium">Date:</span>{" "}
                      {new Date(rec.record_date).toLocaleDateString()}
                    </span>
                  </div>
                  {rec.video_url && (
                    <a
                      href={rec.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition ml-2 shadow-sm active:scale-95 max-w-[120px] text-center"
                      style={{ fontSize: "0.92rem" }}
                    >
                      View Video
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Modal for Add/Edit */}
      {canEdit && showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-2 sm:px-0">
          <div
            className={clsx(
              "rounded-xl w-full max-w-xs sm:max-w-md p-4 sm:p-8 shadow-xl",
              theme === "dark"
                ? "bg-slate-900 ring-1 ring-slate-700"
                : "bg-white border border-gray-200"
            )}
          >
            <h4
              className={clsx(
                "text-base sm:text-lg font-semibold mb-4",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              {editingId ? "Edit Record" : "Add Record"}
            </h4>
            {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label
                  className={clsx(
                    "block text-xs sm:text-sm font-medium mb-1",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Exercise<span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={form.exercise}
                  onChange={(e) =>
                    setForm(
                      (prev: {
                        exercise: string;
                        weight: number;
                        record_date: string;
                        video_url: string;
                        notes: string;
                      }) => ({
                        ...prev,
                        exercise: e.target.value,
                      })
                    )
                  }
                  required
                  className={clsx(
                    "w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm",
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700 text-white focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/50"
                      : "bg-white border-gray-300 text-gray-900 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50"
                  )}
                >
                  <option value="" disabled>
                    Select exercise
                  </option>
                  {ALLOWED_EXERCISES.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={clsx(
                    "block text-xs sm:text-sm font-medium mb-1",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Load (kg)<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.weight || ""}
                  onChange={(e) =>
                    setForm(
                      (prev: {
                        exercise: string;
                        weight: number;
                        record_date: string;
                        video_url: string;
                        notes: string;
                      }) => ({
                        ...prev,
                        weight: Number(e.target.value),
                      })
                    )
                  }
                  required
                  className={clsx(
                    "w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm",
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/50"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50"
                  )}
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label
                  className={clsx(
                    "block text-xs sm:text-sm font-medium mb-1",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Record Date<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="date"
                  value={form.record_date}
                  onChange={(e) =>
                    setForm(
                      (prev: {
                        exercise: string;
                        weight: number;
                        record_date: string;
                        video_url: string;
                        notes: string;
                      }) => ({
                        ...prev,
                        record_date: e.target.value,
                      })
                    )
                  }
                  required
                  className={clsx(
                    "w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm",
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/50"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50"
                  )}
                />
              </div>
              <div>
                <label
                  className={clsx(
                    "block text-xs sm:text-sm font-medium mb-1",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Video Link
                </label>
                <input
                  type="url"
                  value={form.video_url || ""}
                  onChange={(e) =>
                    setForm(
                      (prev: {
                        exercise: string;
                        weight: number;
                        record_date: string;
                        video_url: string;
                        notes: string;
                      }) => ({
                        ...prev,
                        video_url: e.target.value,
                      })
                    )
                  }
                  className={clsx(
                    "w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm",
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/50"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50"
                  )}
                  placeholder="https://..."
                  disabled={uploading}
                />
                {/* Custom file input */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="video-upload"
                    ref={inputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      setSelectedFileName(file ? file.name : "");
                      if (file) {
                        await handleVideoUpload(file);
                      }
                    }}
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    className={clsx(
                      "px-3 py-1.5 rounded bg-yellow-400 text-white text-xs font-medium hover:bg-yellow-500 transition border border-yellow-400",
                      uploading && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={uploading}
                    onClick={() => {
                      if (inputRef.current && !uploading)
                        inputRef.current.click();
                    }}
                  >
                    {uploading ? "Uploading..." : "Upload Video"}
                  </button>
                  <span className="text-xs text-gray-500 truncate max-w-[120px]">
                    {selectedFileName || "No file selected"}
                  </span>
                </div>
                {/* Success message for video upload */}
                {successMessage && (
                  <div className="mt-2 p-2 rounded bg-green-50 border border-green-200 text-green-700 flex items-center gap-2 text-xs">
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{successMessage}</span>
                  </div>
                )}
              </div>
              <div>
                <label
                  className={clsx(
                    "block text-xs sm:text-sm font-medium mb-1",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Notes
                </label>
                <textarea
                  value={form.notes || ""}
                  onChange={(e) =>
                    setForm(
                      (prev: {
                        exercise: string;
                        weight: number;
                        record_date: string;
                        video_url: string;
                        notes: string;
                      }) => ({
                        ...prev,
                        notes: e.target.value,
                      })
                    )
                  }
                  rows={2}
                  className={clsx(
                    "w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm resize-none",
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/50"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50"
                  )}
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex items-center justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setForm(initialForm);
                    setError(null);
                  }}
                  className={clsx(
                    "px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200",
                    theme === "dark"
                      ? "text-slate-300 hover:text-white hover:bg-slate-800"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={clsx(
                    "px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200",
                    theme === "dark"
                      ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 ring-1 ring-yellow-500/30"
                      : "bg-yellow-400 text-white hover:bg-yellow-500"
                  )}
                >
                  {editingId ? "Save Changes" : "Add Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal for Delete Confirmation */}
      {canEdit && showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-2 sm:px-0">
          <div
            className={clsx(
              "rounded-xl w-full max-w-xs sm:max-w-sm p-4 sm:p-8 shadow-xl",
              theme === "dark"
                ? "bg-slate-900 ring-1 ring-slate-700"
                : "bg-white border border-gray-200"
            )}
          >
            <h4
              className={clsx(
                "text-base sm:text-lg font-semibold mb-4 text-center",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}
            >
              Confirm Deletion
            </h4>
            <p className="text-center text-gray-600 mb-6 text-xs sm:text-sm">
              Are you sure you want to delete this record? This action cannot be
              undone.
            </p>
            <div className="flex justify-center gap-2 sm:gap-4">
              <button
                onClick={cancelDelete}
                className={clsx(
                  "px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium",
                  theme === "dark"
                    ? "bg-slate-700 text-white hover:bg-slate-800"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className={clsx(
                  "px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium",
                  theme === "dark"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-500 text-white hover:bg-red-600"
                )}
                disabled={deletingId === pendingDeleteId}
              >
                {deletingId === pendingDeleteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
