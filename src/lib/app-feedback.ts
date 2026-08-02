import { supabase } from "@/src/lib/supabase";

export type FeedbackCategory =
  | "feedback"
  | "verbeterpunt"
  | "uitbreiding"
  | "bug";

export type FeedbackStatus =
  | "nieuw"
  | "bekeken"
  | "gepland"
  | "afgewerkt"
  | "afgewezen";

export type AppFeedback = {
  id: number;
  user_id: string;
  category: FeedbackCategory;
  title: string;
  message: string;
  page_url: string | null;
  status: FeedbackStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function submitAppFeedback(input: {
  category: FeedbackCategory;
  title: string;
  message: string;
  pageUrl?: string;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Je moet aangemeld zijn om feedback te versturen.");
  }

  const { error } = await supabase.from("app_feedback").insert({
    user_id: user.id,
    category: input.category,
    title: input.title.trim(),
    message: input.message.trim(),
    page_url: input.pageUrl?.trim() || null,
  });

  if (error) {
    throw new Error(`Feedback versturen mislukt: ${error.message}`);
  }
}

export async function getAllAppFeedback(): Promise<AppFeedback[]> {
  const { data, error } = await supabase
    .from("app_feedback")
    .select(`
      id,
      user_id,
      category,
      title,
      message,
      page_url,
      status,
      admin_note,
      created_at,
      updated_at,
      profile:profiles!app_feedback_user_id_fkey (
        name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Feedback ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as unknown as AppFeedback[];
}

export async function updateAppFeedback(input: {
  id: number;
  status: FeedbackStatus;
  adminNote: string;
}) {
  const { error } = await supabase
    .from("app_feedback")
    .update({
      status: input.status,
      admin_note: input.adminNote.trim() || null,
    })
    .eq("id", input.id);

  if (error) {
    throw new Error(`Feedback bijwerken mislukt: ${error.message}`);
  }
}
