import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Check if we're in a password reset flow by looking at URL parameters and hash
const isPasswordResetFlow = () => {
  const pathname = window.location.pathname;
  const hash = window.location.hash;
  const params = new URLSearchParams(window.location.search);

  // Check if we're on the password reset pages
  if (pathname === "/update-password" || pathname === "/reset-password") {
    return true;
  }

  // Check if we have recovery tokens in the URL
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      return true;
    }
  }

  // Check for error parameters that might indicate a reset flow
  if (
    params.get("error") === "access_denied" &&
    params.get("error_description")?.includes("Email link")
  ) {
    return true;
  }

  return false;
};

// Only clear session data if there's no valid session in localStorage
// and we're not in a password reset flow
let shouldClearSession = true;
try {
  const storedSession = localStorage.getItem(
    "sb-rbgpmlmgnutmxffjuchk-auth-token"
  );

  if (storedSession) {
    const parsedSession = JSON.parse(storedSession);
    // Check if the session is still valid (not expired)
    if (parsedSession && parsedSession.expires_at * 1000 > Date.now()) {
      shouldClearSession = false;
      console.log("Valid session found, not clearing session data");
    }
  }

  // Don't clear session if we're in password reset flow
  if (isPasswordResetFlow()) {
    shouldClearSession = false;
    console.log("Password reset flow detected, preserving session data");
  }
} catch (e) {
  console.error("Error checking session:", e);
}

// Only clear if needed and not in password reset flow
if (shouldClearSession) {
  console.log("Clearing session data as no valid session found");
  const sessionKeys = [
    "sb-access-token",
    "sb-refresh-token",
    "supabase.auth.token",
    "supabase.auth.refreshToken",
    "sb-rbgpmlmgnutmxffjuchk-auth-token",
    "sb-rbgpmlmgnutmxffjuchk-auth-token-code-verifier",
  ];

  sessionKeys.forEach((key) => localStorage.removeItem(key));
}

// Create a single instance of the Supabase client
const supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Prefer: "return=minimal",
    },
  },
});

// Export a getter function to ensure we always use the same instance
export const getSupabase = () => supabaseInstance;

// For backward compatibility and easier usage
export const supabase = supabaseInstance;

// Add event listener for auth state changes
supabase.auth.onAuthStateChange(
  (event: AuthChangeEvent, session: Session | null) => {
    if (event === "SIGNED_OUT") {
      // Clear any cached data when user signs out
      localStorage.removeItem("userProfile");
    }
  }
);

// Re-export types from database.types.ts
export type {
  Profile,
  CustomMetric,
  MetricResponseType as MetricResponse,
  DailyFormStatus,
} from "./database.types";
