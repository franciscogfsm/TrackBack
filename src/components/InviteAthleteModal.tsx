import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { nanoid } from "nanoid";
import { Trash2, Check, X } from "lucide-react";

interface InviteAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  managerId: string;
  onInviteSuccess?: () => void;
}

export default function InviteAthleteModal({
  isOpen,
  onClose,
  managerId,
  onInviteSuccess,
}: InviteAthleteModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentInvitationId, setCurrentInvitationId] = useState<string | null>(
    null
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  useEffect(() => {
    if (success) {
      // Auto close the modal after showing success for 2 seconds
      const timer = setTimeout(() => {
        // Call onInviteSuccess before closing
        onInviteSuccess?.();
        onClose();
        // Reset states after closing
        setSuccess(false);
        setInviteLink("");
        setEmail("");
        setCurrentInvitationId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, onClose, onInviteSuccess]);

  const generateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Check for existing valid invitations
      const now = new Date().toISOString();
      const { data: existingInvitations, error: checkError } = await supabase
        .from("manager_invitations")
        .select("*")
        .eq("manager_id", managerId)
        .eq("status", "pending")
        .gte("expires_at", now);

      if (checkError) throw checkError;

      if (existingInvitations && existingInvitations.length > 0) {
        setError(
          "You already have an active invitation. Please use or expire the existing invitation before creating a new one."
        );
        setLoading(false);
        return;
      }

      // Generate a unique invitation code
      const invitationCode = nanoid(10);

      // Set expiration to 1 day from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      // Get manager's profile
      const { data: managerProfile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", managerId)
        .single();

      if (profileError) throw profileError;

      // Create the invitation in the database
      const { data: newInvitation, error: inviteError } = await supabase
        .from("manager_invitations")
        .insert({
          manager_id: managerId,
          invitation_code: invitationCode,
          email: email || null,
          expires_at: expiresAt.toISOString(),
          manager_name: managerProfile.full_name,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Store the invitation ID
      if (newInvitation) {
        setCurrentInvitationId(newInvitation.id);
      }

      // Generate the invitation link
      const inviteUrl = `${window.location.origin}/join?code=${invitationCode}`;
      setInviteLink(inviteUrl);

      // Show success message
      setSuccess(true);

      // Don't call onInviteSuccess here, it will be called when modal closes
    } catch (error) {
      console.error("Error generating invitation:", error);
      setError("Failed to generate invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!currentInvitationId) return;

    setDeleteLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("manager_invitations")
        .delete()
        .eq("id", currentInvitationId);

      if (deleteError) throw deleteError;

      // Reset the form
      setInviteLink("");
      setCurrentInvitationId(null);
      setEmail("");

      // Call onInviteSuccess to refresh the list
      onInviteSuccess?.();
    } catch (error) {
      console.error("Error deleting invitation:", error);
      setError("Failed to delete invitation. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Invite Athlete
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <Check className="h-5 w-5" />
              <span>Invitation link created successfully!</span>
            </div>
          </div>
        ) : (
          <form onSubmit={generateInvitation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Athlete's Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="athlete@example.com"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {inviteLink ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg break-all">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Invitation Link (expires in 24 hours):
                  </p>
                  <p className="text-sm text-blue-800">{inviteLink}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors relative"
                  >
                    {showCopyNotification ? (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="h-4 w-4" />
                        Copied!
                      </span>
                    ) : (
                      "Copy Link"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteInvitation}
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {loading ? "Generating..." : "Generate Invitation Link"}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
