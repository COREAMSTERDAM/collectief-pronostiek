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
  const { data: feedbackData, error: feedbackError } = await supabase
    .from("app_feedback")
    .select(
      `
        id,
        user_id,
        category,
        title,
        message,
        page_url,
        status,
        admin_note,
        created_at,
        updated_at
      `,
    )
    .order("created_at", { ascending: false });

  if (feedbackError) {
    throw new Error(
      `Feedback ophalen mislukt: ${feedbackError.message}`,
    );
  }

  const userIds = Array.from(
    new Set((feedbackData ?? []).map((item) => item.user_id)),
  );

  const profilesById = new Map<
    string,
    {
      name: string | null;
      avatar_url: string | null;
    }
  >();

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } =
      await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

    if (profilesError) {
      throw new Error(
        `Profielen ophalen mislukt: ${profilesError.message}`,
      );
    }

    for (const profile of profilesData ?? []) {
      profilesById.set(profile.id, {
        name: profile.name,
        avatar_url: profile.avatar_url,
      });
    }
  }

  return (feedbackData ?? []).map((item) => ({
    ...item,
    profile: profilesById.get(item.user_id) ?? null,
  })) as AppFeedback[];
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
