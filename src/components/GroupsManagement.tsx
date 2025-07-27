import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { AthleteGroup, Profile } from "../lib/database.types";
import { Plus, Users, Edit2, Trash2, UserPlus, UserMinus } from "lucide-react";
import clsx from "clsx";

interface GroupsManagementProps {
  managerId: string;
  onGroupsUpdate?: () => void;
  theme?: "light" | "dark" | "system";
}

const GROUP_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6366F1", // Indigo
];

export default function GroupsManagement({
  managerId,
  onGroupsUpdate,
  theme = "light",
}: GroupsManagementProps) {
  const [groups, setGroups] = useState<AthleteGroup[]>([]);
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AthleteGroup | null>(null);
  const [showManageModal, setShowManageModal] = useState<AthleteGroup | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState<AthleteGroup | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    color: GROUP_COLORS[0],
  });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchGroups();
    fetchAthletes();
  }, [managerId]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_groups")
        .select("*")
        .eq("manager_id", managerId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching groups:", error);
        return;
      }

      if (data) {
        setGroups(data);
      }
    } catch (error) {
      console.error("Unexpected error in fetchGroups:", error);
    }
  };

  const fetchAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("manager_id", managerId)
        .eq("role", "athlete")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Error fetching athletes:", error);
        return;
      }

      if (data) {
        setAthletes(data);
      }
    } catch (error) {
      console.error("Unexpected error in fetchAthletes:", error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    // Clear any existing timeout
    const timeoutId = setTimeout(() => {
      setNotification(null);
    }, 3000);

    return () => clearTimeout(timeoutId);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from("athlete_groups")
        .insert({
          manager_id: managerId,
          name: newGroup.name.trim(),
          description: newGroup.description.trim() || null,
          color: newGroup.color,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating group:", error);
        showNotification("error", "Failed to create group");
        return;
      }

      showNotification("success", "Group created successfully");

      // Update state directly instead of refetching
      setGroups((prev) => [...prev, data]);

      setNewGroup({ name: "", description: "", color: GROUP_COLORS[0] });
      setShowCreateModal(false);

      // Call onGroupsUpdate safely
      try {
        onGroupsUpdate?.();
      } catch (updateError) {
        console.error("Error in onGroupsUpdate callback:", updateError);
      }
    } catch (error) {
      console.error("Unexpected error in handleCreateGroup:", error);
      showNotification("error", "An unexpected error occurred");
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !newGroup.name.trim()) return;

    const updatedData = {
      name: newGroup.name.trim(),
      description: newGroup.description.trim() || null,
      color: newGroup.color,
    };

    const { error } = await supabase
      .from("athlete_groups")
      .update(updatedData)
      .eq("id", editingGroup.id);

    if (error) {
      showNotification("error", "Failed to update group");
    } else {
      showNotification("success", "Group updated successfully");

      // Update state directly instead of refetching
      setGroups((prev) =>
        prev.map((group) =>
          group.id === editingGroup.id
            ? { ...group, ...updatedData, updated_at: new Date().toISOString() }
            : group
        )
      );

      setEditingGroup(null);
      setNewGroup({ name: "", description: "", color: GROUP_COLORS[0] });
      onGroupsUpdate?.();
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // First, delete any training programs assigned to this group
      const { error: trainingProgramsError } = await supabase
        .from("training_programs")
        .delete()
        .eq("group_id", groupId);

      if (trainingProgramsError) {
        console.error(
          "Error deleting training programs:",
          trainingProgramsError
        );
        showNotification(
          "error",
          "Failed to delete associated training programs"
        );
        return;
      }

      // Then delete the group
      const { error: groupError } = await supabase
        .from("athlete_groups")
        .delete()
        .eq("id", groupId);

      if (groupError) {
        showNotification("error", "Failed to delete group");
        return;
      }

      showNotification(
        "success",
        "Group and associated training programs deleted successfully"
      );

      // Update state directly instead of refetching
      setGroups((prev) => prev.filter((group) => group.id !== groupId));

      // Update athletes to remove group_id for those who were in the deleted group
      setAthletes((prev) =>
        prev.map((athlete) =>
          athlete.group_id === groupId
            ? { ...athlete, group_id: null }
            : athlete
        )
      );

      onGroupsUpdate?.();
    } catch (error) {
      console.error("Unexpected error deleting group:", error);
      showNotification(
        "error",
        "An unexpected error occurred while deleting the group"
      );
    }
  };

  const confirmDeleteGroup = () => {
    if (showDeleteConfirm) {
      handleDeleteGroup(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
    }
  };

  const cancelDeleteGroup = () => {
    setShowDeleteConfirm(null);
  };

  const handleAddAthleteToGroup = async (
    athleteId: string,
    groupId: string
  ) => {
    setActionLoading(`add-${athleteId}`);

    // Optimistic update
    setAthletes((prev) =>
      prev.map((athlete) =>
        athlete.id === athleteId ? { ...athlete, group_id: groupId } : athlete
      )
    );

    const { error } = await supabase
      .from("profiles")
      .update({ group_id: groupId })
      .eq("id", athleteId);

    setActionLoading(null);

    if (error) {
      showNotification("error", "Failed to add athlete to group");
      // Revert optimistic update
      setAthletes((prev) =>
        prev.map((athlete) =>
          athlete.id === athleteId ? { ...athlete, group_id: null } : athlete
        )
      );
    } else {
      showNotification("success", "Athlete added to group");
      onGroupsUpdate?.();
    }
  };

  const handleRemoveAthleteFromGroup = async (athleteId: string) => {
    setActionLoading(`remove-${athleteId}`);

    // Store the original group_id for potential revert
    const originalGroupId =
      athletes.find((a) => a.id === athleteId)?.group_id || null;

    // Optimistic update
    setAthletes((prev) =>
      prev.map((athlete) =>
        athlete.id === athleteId ? { ...athlete, group_id: null } : athlete
      )
    );

    const { error } = await supabase
      .from("profiles")
      .update({ group_id: null })
      .eq("id", athleteId);

    setActionLoading(null);

    if (error) {
      showNotification("error", "Failed to remove athlete from group");
      // Revert optimistic update
      setAthletes((prev) =>
        prev.map((athlete) =>
          athlete.id === athleteId
            ? { ...athlete, group_id: originalGroupId }
            : athlete
        )
      );
    } else {
      showNotification("success", "Athlete removed from group");
      onGroupsUpdate?.();
    }
  };

  const openEditModal = (group: AthleteGroup) => {
    setEditingGroup(group);
    setNewGroup({
      name: group.name,
      description: group.description || "",
      color: group.color,
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingGroup(null);
    setNewGroup({ name: "", description: "", color: GROUP_COLORS[0] });
  };

  const getGroupAthletes = (groupId: string) => {
    if (!Array.isArray(athletes) || !groupId) return [];
    return athletes.filter((athlete) => athlete?.group_id === groupId);
  };

  const getUngroupedAthletes = () => {
    if (!Array.isArray(athletes)) return [];
    return athletes.filter((athlete) => !athlete?.group_id);
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500">Loading groups...</div>
    );
  }

  // Safety check
  if (!managerId) {
    return (
      <div className="py-8 text-center text-red-500">
        Error: Manager ID is required
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={clsx(
            "fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border transition-all duration-500 transform",
            "animate-in slide-in-from-right-5 fade-in-0",
            notification.type === "success"
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400 shadow-green-500/25"
              : "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 shadow-red-500/25"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {notification.type === "success" ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
            <div className="font-medium text-sm">{notification.message}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Manage Groups</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Group
        </button>
      </div>

      {/* Groups List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(groups) && groups.length > 0 ? (
          groups.map((group) => {
            if (!group || !group.id) return null;
            const groupAthletes = getGroupAthletes(group.id);
            return (
              <div
                key={group.id}
                className={clsx(
                  "rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md",
                  theme === "dark"
                    ? "bg-blue-900/40 border-blue-700/50 hover:border-blue-600/70"
                    : "bg-white border-gray-200 hover:border-gray-300"
                )}
              >
                <div
                  className="h-3"
                  style={{ backgroundColor: group.color || "#3B82F6" }}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3
                        className={clsx(
                          "text-lg font-semibold",
                          theme === "dark" ? "text-blue-100" : "text-gray-900"
                        )}
                      >
                        {group.name || "Unnamed Group"}
                      </h3>
                      {group.description && (
                        <p
                          className={clsx(
                            "text-sm mt-1",
                            theme === "dark" ? "text-blue-200" : "text-gray-600"
                          )}
                        >
                          {group.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(group)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(group)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      {groupAthletes.length} athletes
                    </div>
                    <button
                      onClick={() => setShowManageModal(group)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Manage Athletes
                    </button>
                  </div>

                  {/* Athletes Preview */}
                  <div className="space-y-2">
                    {groupAthletes.slice(0, 3).map((athlete) => (
                      <div key={athlete.id} className="flex items-center gap-3">
                        <img
                          src={
                            athlete.avatar_url ||
                            "https://via.placeholder.com/32"
                          }
                          alt={athlete.full_name}
                          className="h-8 w-8 rounded-full"
                        />
                        <span className="text-sm text-gray-700">
                          {athlete.full_name}
                        </span>
                      </div>
                    ))}
                    {groupAthletes.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{groupAthletes.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            No groups created yet. Create your first group to get started!
          </div>
        )}
      </div>

      {/* Ungrouped Athletes */}
      {getUngroupedAthletes().length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ungrouped Athletes ({getUngroupedAthletes().length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {getUngroupedAthletes().map((athlete) => (
              <div
                key={athlete.id}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-lg",
                  theme === "dark"
                    ? "bg-blue-900/30 border border-blue-700/50"
                    : "bg-white"
                )}
              >
                <img
                  src={athlete.avatar_url || "https://via.placeholder.com/32"}
                  alt={athlete.full_name}
                  className="h-10 w-10 rounded-full"
                />
                <span className="text-sm text-gray-700 flex-1">
                  {athlete.full_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            className={clsx(
              "rounded-xl max-w-md w-full p-6",
              theme === "dark"
                ? "bg-blue-900/95 border border-blue-700/50"
                : "bg-white"
            )}
          >
            <h3
              className={clsx(
                "text-lg font-semibold mb-4",
                theme === "dark" ? "text-blue-100" : "text-gray-900"
              )}
            >
              {editingGroup ? "Edit Group" : "Create New Group"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingGroup) {
                  handleUpdateGroup(e);
                } else {
                  handleCreateGroup(e);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter group name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter group description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewGroup({ ...newGroup, color })}
                        className={clsx(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          newGroup.color === color
                            ? "border-gray-800 scale-110"
                            : "border-gray-300"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingGroup ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Athletes Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            className={clsx(
              "rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto",
              theme === "dark"
                ? "bg-blue-900/95 border border-blue-700/50"
                : "bg-white"
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                className={clsx(
                  "text-lg font-semibold",
                  theme === "dark" ? "text-blue-100" : "text-gray-900"
                )}
              >
                Manage Athletes - {showManageModal.name}
              </h3>
              <button
                onClick={() => setShowManageModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Athletes in this group */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">
                Athletes in this group (
                {getGroupAthletes(showManageModal.id).length})
              </h4>
              <div className="space-y-2">
                {getGroupAthletes(showManageModal.id).map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          athlete.avatar_url || "https://via.placeholder.com/32"
                        }
                        alt={athlete.full_name}
                        className="h-10 w-10 rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {athlete.full_name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveAthleteFromGroup(athlete.id)}
                      disabled={actionLoading === `remove-${athlete.id}`}
                      className={clsx(
                        "flex items-center gap-1 px-3 py-1 rounded transition-colors",
                        actionLoading === `remove-${athlete.id}`
                          ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                          : "text-red-600 hover:bg-red-50"
                      )}
                    >
                      <UserMinus className="h-4 w-4" />
                      {actionLoading === `remove-${athlete.id}`
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                ))}
                {getGroupAthletes(showManageModal.id).length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No athletes in this group yet
                  </div>
                )}
              </div>
            </div>

            {/* Available athletes */}
            {getUngroupedAthletes().length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Available Athletes ({getUngroupedAthletes().length})
                </h4>
                <div className="space-y-2">
                  {getUngroupedAthletes().map((athlete) => (
                    <div
                      key={athlete.id}
                      className={clsx(
                        "flex items-center justify-between p-3 border rounded-lg",
                        theme === "dark"
                          ? "bg-blue-900/30 border-blue-700/50"
                          : "bg-white border-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            athlete.avatar_url ||
                            "https://via.placeholder.com/32"
                          }
                          alt={athlete.full_name}
                          className="h-10 w-10 rounded-full"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {athlete.full_name}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleAddAthleteToGroup(
                            athlete.id,
                            showManageModal.id
                          )
                        }
                        disabled={actionLoading === `add-${athlete.id}`}
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1 rounded transition-colors",
                          actionLoading === `add-${athlete.id}`
                            ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                            : "text-blue-600 hover:bg-blue-50"
                        )}
                      >
                        <UserPlus className="h-4 w-4" />
                        {actionLoading === `add-${athlete.id}`
                          ? "Adding..."
                          : "Add"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={clsx(
              "rounded-2xl shadow-xl w-full max-w-md",
              theme === "dark"
                ? "bg-blue-900/90 border border-blue-700/50"
                : "bg-white border border-gray-200"
            )}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3
                  className={clsx(
                    "text-lg font-semibold",
                    theme === "dark" ? "text-blue-100" : "text-gray-900"
                  )}
                >
                  Delete Group
                </h3>
              </div>

              <div className="space-y-3 mb-6">
                <p
                  className={clsx(
                    "text-sm",
                    theme === "dark" ? "text-blue-200" : "text-gray-600"
                  )}
                >
                  Are you sure you want to delete the group{" "}
                  <span className="font-medium text-red-600">
                    "{showDeleteConfirm.name}"
                  </span>
                  ?
                </p>
                <div
                  className={clsx(
                    "p-3 rounded-lg border-l-4 border-red-500",
                    theme === "dark" ? "bg-red-900/20" : "bg-red-50"
                  )}
                >
                  <p
                    className={clsx(
                      "text-sm font-medium",
                      theme === "dark" ? "text-red-200" : "text-red-800"
                    )}
                  >
                    ⚠️ Warning: This action will also delete any training
                    programs assigned to this group.
                  </p>
                </div>
                <p
                  className={clsx(
                    "text-xs",
                    theme === "dark" ? "text-blue-300" : "text-gray-500"
                  )}
                >
                  This action cannot be undone. Athletes in this group will be
                  moved to "No Group".
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteGroup}
                  className={clsx(
                    "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                    theme === "dark"
                      ? "bg-blue-800/50 text-blue-200 hover:bg-blue-800/70"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteGroup}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
