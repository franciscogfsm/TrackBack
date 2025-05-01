import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Starting reminder check...");
    const startTime = Date.now();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      return new Response(
        JSON.stringify({ success: true, message: "No reminders on weekends." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current time in HH:MM format
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Lisbon", // or your desired timezone
    });
    const [hour, minute] = formatter
      .formatToParts(now)
      .filter((part) => part.type === "hour" || part.type === "minute")
      .map((part) => part.value);
    const currentTime = `${hour}:${minute}`;

    console.log(`Current time: ${currentTime}`);

    // Get all managers' daily form status with their global reminder time
    const { data: managerSettings, error: settingsError } = await supabaseClient
      .from("daily_form_status")
      .select("manager_id, global_reminder_time, enable_reminders")
      .eq("enable_reminders", true)
      .eq("global_reminder_time", currentTime);

    if (settingsError) {
      console.error("Error fetching manager settings:", settingsError);
      throw settingsError;
    }

    console.log(
      `Found ${
        managerSettings?.length || 0
      } managers with reminders scheduled for ${currentTime}`
    );

    // Track statistics
    let totalAthletes = 0;
    let remindersSent = 0;
    let errors = 0;

    // For each manager whose reminder time matches current time
    for (const settings of managerSettings || []) {
      try {
        // Get all athletes managed by this manager
        const { data: athletes, error: athletesError } = await supabaseClient
          .from("profiles")
          .select("id, email, full_name")
          .eq("manager_id", settings.manager_id)
          .eq("role", "athlete");

        if (athletesError) {
          console.error(
            `Error fetching athletes for manager ${settings.manager_id}:`,
            athletesError
          );
          errors++;
          continue;
        }

        totalAthletes += athletes?.length || 0;

        // For each athlete, check if they've submitted training today
        for (const athlete of athletes || []) {
          try {
            // Check if athlete has already submitted all required metrics today
            const today = new Date().toISOString().split("T")[0];
            // First get all required metrics for this athlete
            const { data: requiredMetrics } = await supabaseClient
              .from("custom_metrics")
              .select("id")
              .eq("manager_id", settings.manager_id);
            if (!requiredMetrics?.length) {
              console.log(
                `No metrics required for manager ${settings.manager_id}`
              );
              continue; // Skip if no metrics are required
            }
            console.log(
              `Found ${requiredMetrics.length} required metrics for manager ${settings.manager_id}`
            );

            // Then get all responses for today
            const { data: responses } = await supabaseClient
              .from("metric_responses")
              .select("metric_id")
              .eq("athlete_id", athlete.id)
              .eq("date", today);
            console.log(
              `Athlete ${athlete.id} has ${
                responses?.length || 0
              } responses for today`
            );

            // Check if all required metrics have been submitted
            const submittedMetricIds = new Set(
              responses?.map((r) => r.metric_id) || []
            );
            const hasSubmittedAllMetrics = requiredMetrics.every((metric) =>
              submittedMetricIds.has(metric.id)
            );
            console.log(
              `Athlete ${athlete.id} has submitted all metrics: ${hasSubmittedAllMetrics}`
            );

            // If not all metrics are submitted, send reminder
            if (!hasSubmittedAllMetrics) {
              console.log(
                `Sending reminder to athlete ${athlete.id} (${athlete.email})`
              );
              const { error: emailError } =
                await supabaseClient.functions.invoke("send-reminder-email", {
                  body: {
                    email: athlete.email,
                    name: athlete.full_name,
                  },
                });

              if (emailError) {
                console.error(
                  `Error sending email to ${athlete.email}:`,
                  emailError
                );
                errors++;
              } else {
                remindersSent++;
              }
            }
          } catch (error) {
            console.error(`Error processing athlete ${athlete.id}:`, error);
            errors++;
          }
        }
      } catch (error) {
        console.error(
          `Error processing manager ${settings.manager_id}:`,
          error
        );
        errors++;
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`
Reminder check completed:
- Execution time: ${executionTime}ms
- Total athletes checked: ${totalAthletes}
- Reminders sent: ${remindersSent}
- Errors encountered: ${errors}
    `);

    return new Response(
      JSON.stringify({
        success: true,
        statistics: {
          executionTime,
          totalAthletes,
          remindersSent,
          errors,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-reminders function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
