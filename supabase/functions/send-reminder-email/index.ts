import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      throw new Error("Missing required fields: email and name are required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate a magic link for direct dashboard access
    const { data: linkData, error: linkError } =
      await supabaseClient.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: {
          redirectTo: `${Deno.env.get("FRONTEND_URL")}/athlete-dashboard`,
        },
      });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      throw linkError;
    }

    const { error } = await supabaseClient.functions.invoke("send-email", {
      body: {
        to: email,
        subject: "Time to Log Your Training! 🏃‍♂️",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-bottom: 20px;">Hey ${name}! 👋</h2>
              
              <p style="color: #334155; line-height: 1.6;">
                Just a friendly reminder to log your training sessions for today. Your consistent tracking helps build a better picture of your training journey!
              </p>
              
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #334155; margin: 0 0 10px 0; font-weight: 600;">Don't forget to record:</p>
                <ul style="color: #334155; margin: 0; padding-left: 20px;">
                  <li>Morning training session (if you trained)</li>
                  <li>Afternoon training session (if you trained)</li>
                  <li>Your daily wellness metrics</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${linkData.properties.action_link}" 
                   style="display: inline-block; padding: 12px 28px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; transition: background-color 0.2s;">
                  Log Your Training
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 0.9em; text-align: center; margin-top: 20px;">
                Already logged your training? You can ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              
              <p style="color: #64748b; font-size: 0.9em; text-align: center; margin: 0;">
                Best regards,<br>
                Your TrackBack Team
              </p>
            </div>
          </div>
        `,
        tags: [
          {
            name: "category",
            value: "reminder",
          },
        ],
      },
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending reminder email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
