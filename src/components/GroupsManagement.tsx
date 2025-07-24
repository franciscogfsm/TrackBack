import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { AthleteGroup, Profile } from "../lib/database.types";
import { Plus, Users, Edit2, Trash2, UserPlus, UserMinus } from "lucide-react";
import clsx from "clsx";

interface GroupsManagementProps {
  managerId: string;
  onGroupsUpdate?: () => void;
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
    const { data, error } = await supabase
      .from("athlete_groups")
      .select("*")
      .eq("manager_id", managerId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setGroups(data);
    }
  };

  const fetchAthletes = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("manager_id", managerId)
      .eq("role", "athlete")
      .order("full_name", { ascending: true });

    if (!error && data) {
      setAthletes(data);
    }
    setLoading(false);
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });

    // Auto-hide after 4 seconds with a smooth fade out
    setTimeout(() => {
      const notificationEl = document.querySelector("[data-notification]");
      if (notificationEl) {
        notificationEl.classList.remove("notification-enter");
        notificationEl.classList.add("notification-exit");

        // Remove from state after exit animation completes
        setTimeout(() => setNotification(null), 200);
      }
    }, 4000);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;

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
      showNotification("error", "Failed to create group");
    } else {
      showNotification("success", "Group created successfully");

      // Update state directly instead of refetching
      setGroups((prev) => [...prev, data]);

      setNewGroup({ name: "", description: "", color: GROUP_COLORS[0] });
      setShowCreateModal(false);
      onGroupsUpdate?.();
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
    const { error } = await supabase
      .from("athlete_groups")
      .delete()
      .eq("id", groupId);

    if (error) {
      showNotification("error", "Failed to delete group");
    } else {
      showNotification("success", "Group deleted successfully");

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
    }
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
    return athletes.filter((athlete) => athlete.group_id === groupId);
  };

  const getUngroupedAthletes = () => {
    return athletes.filter((athlete) => !athlete.group_id);
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500">Loading groups...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          data-notification
          className={clsx(
            "fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-sm border transition-all duration-300 transform",
            "max-w-sm w-full sm:w-auto min-w-[300px] notification-enter hover:scale-105 cursor-pointer",
            notification.type === "success"
              ? "bg-white/95 border-green-200 text-green-800 shadow-green-100 hover:shadow-green-200"
              : "bg-white/95 border-red-200 text-red-800 shadow-red-100 hover:shadow-red-200"
          )}
          onClick={() => {
            const el = document.querySelector("[data-notification]");
            if (el) {
              el.classList.add("notification-exit");
              setTimeout(() => setNotification(null), 200);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                notification.type === "success"
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              )}
            >
              {notification.type === "success" ? (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className={clsx(
                "flex-shrink-0 p-1 rounded-lg transition-colors",
                notification.type === "success"
                  ? "hover:bg-green-50 text-green-400 hover:text-green-600"
                  : "hover:bg-red-50 text-red-400 hover:text-red-600"
              )}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Progress bar for auto-dismiss */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 rounded-b-2xl overflow-hidden">
            <div
              className={clsx(
                "h-full w-full origin-left",
                notification.type === "success" ? "bg-green-400" : "bg-red-400"
              )}
              style={{
                transform: "scaleX(1)",
                animation: "progress-shrink 4s linear forwards",
              }}
            />
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
        {groups.map((group) => {
          const groupAthletes = getGroupAthletes(group.id);
          return (
            <div
              key={group.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300"
            >
              <div className="h-3" style={{ backgroundColor: group.color }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-1">
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
                      onClick={() => handleDeleteGroup(group.id)}
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
                          athlete.avatar_url || "https://via.placeholder.com/32"
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
        })}
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
                className="flex items-center gap-3 p-3 bg-white rounded-lg"
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
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingGroup ? "Edit Group" : "Create New Group"}
            </h3>
            <form
              onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
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
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
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
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
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
    </div>
  );
}
