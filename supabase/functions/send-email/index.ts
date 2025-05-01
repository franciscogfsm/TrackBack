// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer, cache-control, x-requested-with, range",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-range",
  "Access-Control-Max-Age": "86400",
};

interface EmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  replyTo?: string[];
  subject: string;
  text?: string;
  html?: string;
  tags?: Array<{ name: string; value: string }>;
}

console.info("Email service started");

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the request body
    const payload: EmailPayload = await req.json();

    // Validate required fields
    if (!payload.to || !payload.subject) {
      throw new Error("Missing required fields: to, subject");
    }

    // Initialize Resend with your API key
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(apiKey);

    // Prepare email data with verified domain
    const emailData = {
      from: "TrackBack <noreply@thetrackback.com>",
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      reply_to: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      tags: payload.tags,
    };

    // Send the email
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        data,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
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
