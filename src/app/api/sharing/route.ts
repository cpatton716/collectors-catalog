import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { isUserSuspended } from "@/lib/adminAuth";
import {
  getProfileByClerkId,
  getSharingSettings,
  togglePublicSharing,
  updatePublicProfileSettings,
} from "@/lib/db";

// GET - Get current sharing settings
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const settings = await getSharingSettings(profile.id);
    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    return NextResponse.json({
      isPublic: settings.isPublic,
      publicSlug: settings.publicSlug,
      publicDisplayName: settings.publicDisplayName,
      publicBio: settings.publicBio,
      shareUrl:
        settings.isPublic && settings.publicSlug
          ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/u/${settings.publicSlug}`
          : null,
    });
  } catch (error) {
    console.error("Error getting sharing settings:", error);
    return NextResponse.json({ error: "Failed to get sharing settings" }, { status: 500 });
  }
}

// POST - Toggle public sharing on/off
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is suspended
    const suspensionStatus = await isUserSuspended(userId);
    if (suspensionStatus.suspended) {
      return NextResponse.json({ error: "Your account has been suspended." }, { status: 403 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { enable, customSlug } = body;

    if (typeof enable !== "boolean") {
      return NextResponse.json({ error: "enable must be a boolean" }, { status: 400 });
    }

    // Validate custom slug if provided
    if (customSlug) {
      const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
      if (customSlug.length < 3 || customSlug.length > 30) {
        return NextResponse.json(
          { error: "URL must be between 3 and 30 characters" },
          { status: 400 }
        );
      }
      if (!slugRegex.test(customSlug) && customSlug.length > 2) {
        return NextResponse.json(
          { error: "URL can only contain lowercase letters, numbers, and hyphens" },
          { status: 400 }
        );
      }
    }

    const result = await togglePublicSharing(profile.id, enable, customSlug);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      isPublic: enable,
      publicSlug: result.slug,
      shareUrl:
        enable && result.slug ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/u/${result.slug}` : null,
    });
  } catch (error) {
    console.error("Error toggling public sharing:", error);
    return NextResponse.json({ error: "Failed to update sharing settings" }, { status: 500 });
  }
}

// PATCH - Update public profile settings
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is suspended
    const suspensionStatus = await isUserSuspended(userId);
    if (suspensionStatus.suspended) {
      return NextResponse.json({ error: "Your account has been suspended." }, { status: 403 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { publicDisplayName, publicBio, publicSlug } = body;

    // Validate slug if provided
    if (publicSlug !== undefined) {
      if (publicSlug) {
        const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
        if (publicSlug.length < 3 || publicSlug.length > 30) {
          return NextResponse.json(
            { error: "URL must be between 3 and 30 characters" },
            { status: 400 }
          );
        }
        if (!slugRegex.test(publicSlug) && publicSlug.length > 2) {
          return NextResponse.json(
            { error: "URL can only contain lowercase letters, numbers, and hyphens" },
            { status: 400 }
          );
        }
      }
    }

    // Validate display name length
    if (publicDisplayName && publicDisplayName.length > 50) {
      return NextResponse.json(
        { error: "Display name must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Validate bio length
    if (publicBio && publicBio.length > 200) {
      return NextResponse.json({ error: "Bio must be 200 characters or less" }, { status: 400 });
    }

    const result = await updatePublicProfileSettings(profile.id, {
      publicDisplayName,
      publicBio,
      publicSlug,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating public profile settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
