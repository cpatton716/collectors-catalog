import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabase } from "@/lib/supabase";

// Clerk webhook types
interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    deleted?: boolean;
  };
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Get headers for verification
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle the user.deleted event
  if (event.type === "user.deleted") {
    const clerkUserId = event.data.id;

    try {
      // Find the user's profile in Supabase
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", clerkUserId)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ received: true });
      }

      const profileId = profile.id;

      // Delete all user data (cascade will handle related records)
      // But let's be explicit for audit purposes

      // 1. Delete sales records
      const { error: salesError } = await supabase
        .from("sales")
        .delete()
        .eq("user_id", profileId);

      if (salesError) {
        console.error("Error deleting sales:", salesError);
      }

      // 2. Delete comic_lists associations (will cascade, but being explicit)
      const { data: userComics } = await supabase
        .from("comics")
        .select("id")
        .eq("user_id", profileId);

      if (userComics && userComics.length > 0) {
        const comicIds = userComics.map((c) => c.id);
        await supabase
          .from("comic_lists")
          .delete()
          .in("comic_id", comicIds);
      }

      // 3. Delete comics
      const { error: comicsError } = await supabase
        .from("comics")
        .delete()
        .eq("user_id", profileId);

      if (comicsError) {
        console.error("Error deleting comics:", comicsError);
      }

      // 4. Delete lists
      const { error: listsError } = await supabase
        .from("lists")
        .delete()
        .eq("user_id", profileId);

      if (listsError) {
        console.error("Error deleting lists:", listsError);
      }

      // 5. Finally, delete the profile
      const { error: deleteProfileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profileId);

      if (deleteProfileError) {
        console.error("Error deleting profile:", deleteProfileError);
        return NextResponse.json(
          { error: "Failed to delete user data" },
          { status: 500 }
        );
      }

      return NextResponse.json({ received: true, deleted: true });

    } catch (err) {
      console.error("Error processing user deletion:", err);
      return NextResponse.json(
        { error: "Failed to process deletion" },
        { status: 500 }
      );
    }
  }

  // Return success for other event types
  return NextResponse.json({ received: true });
}
