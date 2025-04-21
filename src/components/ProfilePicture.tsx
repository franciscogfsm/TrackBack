import React, { useState } from "react";
import { User, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/database.types";

interface Props {
  profile: Profile;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onUpdate?: (url: string) => void;
}

export default function ProfilePicture({
  profile,
  size = "md",
  editable = false,
  onUpdate,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      console.log("Starting file upload...");
      console.log("File path:", filePath);
      console.log("File size:", file.size);
      console.log("File type:", file.type);

      // Upload the file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      console.log("Public URL:", publicUrl);

      // Update the profile with the new avatar URL
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateError) {
        console.error("Profile update error:", updateError);
        throw updateError;
      }

      console.log("Profile updated successfully:", updateData);

      // Call onUpdate with the new URL immediately after successful update
      if (onUpdate) {
        onUpdate(publicUrl);
      }

      // Force a re-render by updating the profile prop
      profile.avatar_url = publicUrl;
    } catch (error) {
      console.error("Error in handleUpload:", error);
      setError(
        error instanceof Error ? error.message : "Error uploading avatar"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <div
        className={`relative rounded-full overflow-hidden bg-blue-100 flex items-center justify-center ${sizeClasses[size]}`}
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={`${profile.full_name}'s avatar`}
            className="w-full h-full object-cover"
          />
        ) : (
          <User
            className={`${
              size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-8 h-8"
            } text-blue-600`}
          />
        )}

        {editable && (
          <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            <Upload className="w-5 h-5 text-white" />
          </label>
        )}
      </div>
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-red-500 text-center">
          {error}
        </div>
      )}
      {uploading && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-blue-500 text-center">
          Uploading...
        </div>
      )}
    </div>
  );
}
