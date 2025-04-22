import { supabase } from "./supabase";

export interface EmailMessage {
  name: string;
  email: string;
  message: string;
}

export const sendContactMessage = async (message: EmailMessage) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: "martinsfrancisco2005@gmail.com", // Your email address
        subject: `New Contact Form Message from ${message.name}`,
        text: `
Name: ${message.name}
Email: ${message.email}

Message:
${message.message}
        `,
      },
    });

    if (error) {
      console.error("Function error:", error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.message || "Failed to send email");
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
};

export const sendInvitationEmail = async (
  email: string,
  invitationLink: string,
  managerName: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: email,
        subject: `Join ${managerName}'s Team on TrackBack`,
        text: `
You've been invited to join ${managerName}'s team on TrackBack!

Click the link below to accept the invitation:
${invitationLink}

This link will expire in 24 hours.

Best regards,
The TrackBack Team
        `,
      },
    });

    if (error) {
      console.error("Function error:", error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.message || "Failed to send email");
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
};
