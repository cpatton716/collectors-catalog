import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getProfileByClerkId } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// GET - Get all comics marked for trade (excluding user's own)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    // Get current user's profile ID to exclude their comics
    let excludeUserId: string | null = null;
    if (userId) {
      const profile = await getProfileByClerkId(userId);
      if (profile) {
        excludeUserId = profile.id;
      }
    }

    // Query comics marked for trade
    let query = supabase
      .from("comics")
      .select(`
        id,
        title,
        issue_number,
        publisher,
        cover_image_url,
        grade,
        estimated_value,
        user_id,
        profiles!comics_user_id_fkey (
          id,
          display_name,
          username,
          seller_rating,
          seller_rating_count
        )
      `)
      .eq("for_trade", true)
      .order("updated_at", { ascending: false })
      .limit(100);

    // Exclude current user's comics
    if (excludeUserId) {
      query = query.neq("user_id", excludeUserId);
    }

    const { data: comics, error } = await query;

    if (error) throw error;

    // Transform to response format
    const transformed = (comics || []).map((comic: any) => ({
      id: comic.id,
      title: comic.title,
      issueNumber: comic.issue_number,
      publisher: comic.publisher,
      coverImageUrl: comic.cover_image_url,
      grade: comic.grade,
      estimatedValue: comic.estimated_value,
      owner: {
        id: comic.profiles?.id,
        displayName: comic.profiles?.display_name || "Collector",
        username: comic.profiles?.username,
        rating: comic.profiles?.seller_rating,
        ratingCount: comic.profiles?.seller_rating_count,
      },
    }));

    return NextResponse.json({ comics: transformed });
  } catch (error) {
    console.error("Error fetching tradeable comics:", error);
    return NextResponse.json(
      { error: "Failed to fetch tradeable comics" },
      { status: 500 }
    );
  }
}
