import { supabase } from "@/integrations/supabase/client";

interface SendNotificationParams {
  type: "new_follower" | "new_prediction";
  recipientEmail: string;
  recipientName: string;
  actorName: string;
  predictionTitle?: string;
}

export const sendNotificationEmail = async ({
  type,
  recipientEmail,
  recipientName,
  actorName,
  predictionTitle,
}: SendNotificationParams): Promise<boolean> => {
  try {
    console.log("Sending notification email:", { type, recipientEmail, actorName });

    const { data, error } = await supabase.functions.invoke("send-notification-email", {
      body: {
        type,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        actor_name: actorName,
        prediction_title: predictionTitle,
      },
    });

    if (error) {
      console.error("Error sending notification email:", error);
      return false;
    }

    console.log("Notification email sent successfully:", data);
    return true;
  } catch (error) {
    console.error("Error in sendNotificationEmail:", error);
    return false;
  }
};

// Helper to get user email from user_id
export const getUserEmail = async (userId: string): Promise<{ email: string; displayName: string } | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    email: data.email,
    displayName: data.display_name || data.email.split("@")[0],
  };
};
