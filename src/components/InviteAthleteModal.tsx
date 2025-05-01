import React, { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess: () => void;
  managerId: string;
}

export default function InviteAthleteModal({
  isOpen,
  onClose,
  onInviteSuccess,
  managerId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for existing active invitations
      const now = new Date().toISOString();
      const { data: activeInvitations, error: checkError } = await supabase
        .from("manager_invitations")
        .select("*")
        .eq("manager_id", managerId)
        .gt("expires_at", now)
        .eq("status", "pending");

      if (checkError) {
        throw checkError;
      }

      if (activeInvitations && activeInvitations.length > 0) {
        setError(
          "You already have an active invitation. Please wait for it to expire or delete it before creating a new one."
        );
        return;
      }

      // First fetch the manager's name
      const { data: managerData, error: managerError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", managerId)
        .single();

      if (managerError) {
        throw managerError;
      }

      if (!managerData?.full_name) {
        throw new Error("Manager profile not found");
      }

      // Generate a random invitation code
      const invitationCode = Math.random().toString(36).substring(2, 15);

      // Set expiration to 1 day from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      const { error: createError } = await supabase
        .from("manager_invitations")
        .insert({
          manager_id: managerId,
          invitation_code: invitationCode,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          manager_name: managerData.full_name,
        });

      if (createError) {
        throw createError;
      }

      // Call onInviteSuccess and close modal
      onInviteSuccess();
      onClose();

      // Refresh the page
      window.location.reload();
    } catch (err) {
      console.error("Error generating invitation:", err);
      setError("Failed to generate invitation link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Invite Athlete</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Generate a unique invitation link that will be valid for 24 hours.
              You can share this link with your athlete to join your team.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerateInvitation}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Generating...
                </>
              ) : (
                "Generate Invitation Link"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
