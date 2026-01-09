import { supabase } from "./supabase";
import { CollectionItem, UserList, SaleRecord } from "@/types/comic";

// Profile management
export async function getOrCreateProfile(clerkUserId: string, email?: string) {
  // First try to get existing profile
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (existing) return existing;

  // Create new profile
  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({ clerk_user_id: clerkUserId, email })
    .select()
    .single();

  if (error) throw error;
  return newProfile;
}

export async function getProfileByClerkId(clerkUserId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
}

// Comics
export async function getUserComics(profileId: string): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from("comics")
    .select(`
      *,
      comic_lists(list_id)
    `)
    .eq("user_id", profileId)
    .order("date_added", { ascending: false });

  if (error) throw error;

  // Transform to CollectionItem format
  return (data || []).map(transformDbComicToCollectionItem);
}

export async function addComic(profileId: string, item: CollectionItem) {
  const dbComic = transformCollectionItemToDbComic(item, profileId);

  const { data, error } = await supabase
    .from("comics")
    .insert(dbComic)
    .select()
    .single();

  if (error) throw error;

  // Add to lists
  if (item.listIds.length > 0) {
    const listInserts = item.listIds.map((listId) => ({
      comic_id: data.id,
      list_id: listId,
    }));
    await supabase.from("comic_lists").insert(listInserts);
  }

  return data;
}

export async function updateComic(comicId: string, updates: Partial<CollectionItem>) {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.comic) {
    Object.assign(dbUpdates, {
      title: updates.comic.title,
      issue_number: updates.comic.issueNumber,
      variant: updates.comic.variant,
      publisher: updates.comic.publisher,
      cover_artist: updates.comic.coverArtist,
      writer: updates.comic.writer,
      interior_artist: updates.comic.interiorArtist,
      release_year: updates.comic.releaseYear,
      confidence: updates.comic.confidence,
      is_slabbed: updates.comic.isSlabbed,
      grading_company: updates.comic.gradingCompany,
      grade: updates.comic.grade,
      is_signature_series: updates.comic.isSignatureSeries,
      signed_by: updates.comic.signedBy,
      price_data: updates.comic.priceData,
    });
  }

  if (updates.coverImageUrl !== undefined) dbUpdates.cover_image_url = updates.coverImageUrl;
  if (updates.conditionGrade !== undefined) dbUpdates.condition_grade = updates.conditionGrade;
  if (updates.conditionLabel !== undefined) dbUpdates.condition_label = updates.conditionLabel;
  if (updates.isGraded !== undefined) dbUpdates.is_graded = updates.isGraded;
  if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
  if (updates.purchaseDate !== undefined) dbUpdates.purchase_date = updates.purchaseDate;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.forSale !== undefined) dbUpdates.for_sale = updates.forSale;
  if (updates.askingPrice !== undefined) dbUpdates.asking_price = updates.askingPrice;
  if (updates.isStarred !== undefined) dbUpdates.is_starred = updates.isStarred;

  const { error } = await supabase
    .from("comics")
    .update(dbUpdates)
    .eq("id", comicId);

  if (error) throw error;
}

export async function deleteComic(comicId: string) {
  const { error } = await supabase.from("comics").delete().eq("id", comicId);
  if (error) throw error;
}

// Lists
export async function getUserLists(profileId: string): Promise<UserList[]> {
  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("user_id", profileId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    isDefault: list.is_default,
    createdAt: list.created_at,
  }));
}

// Sales
export async function recordSale(
  profileId: string,
  item: CollectionItem,
  salePrice: number,
  buyerId?: string
): Promise<SaleRecord> {
  const { data, error } = await supabase
    .from("sales")
    .insert({
      user_id: profileId,
      comic_title: item.comic.title,
      comic_issue_number: item.comic.issueNumber,
      comic_variant: item.comic.variant,
      comic_publisher: item.comic.publisher,
      cover_image_url: item.coverImageUrl,
      purchase_price: item.purchasePrice,
      sale_price: salePrice,
      profit: salePrice - (item.purchasePrice || 0),
      buyer_id: buyerId || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Delete the comic from collection
  await deleteComic(item.id);

  return {
    id: data.id,
    comic: item.comic,
    coverImageUrl: item.coverImageUrl,
    purchasePrice: item.purchasePrice,
    salePrice: data.sale_price,
    saleDate: data.sale_date,
    profit: data.profit,
    buyerId: data.buyer_id,
  };
}

// Migration: Import localStorage data to Supabase
export async function migrateLocalDataToCloud(
  profileId: string,
  comics: CollectionItem[],
  lists: UserList[],
  sales: SaleRecord[]
) {
  // Get existing default lists for the user
  const existingLists = await getUserLists(profileId);
  const defaultListMap = new Map<string, string>();

  // Map old default list IDs to new ones
  existingLists.forEach((list) => {
    if (list.name === "My Collection") defaultListMap.set("collection", list.id);
    if (list.name === "Want List") defaultListMap.set("want-list", list.id);
    if (list.name === "For Sale") defaultListMap.set("for-sale", list.id);
    if (list.name === "Slabbed") defaultListMap.set("slabbed", list.id);
    if (list.name === "Passed On") defaultListMap.set("passed-on", list.id);
  });

  // Import custom lists
  const customLists = lists.filter((l) => !l.isDefault);
  for (const list of customLists) {
    const { data } = await supabase
      .from("lists")
      .insert({
        user_id: profileId,
        name: list.name,
        description: list.description,
        is_default: false,
      })
      .select()
      .single();

    if (data) {
      defaultListMap.set(list.id, data.id);
    }
  }

  // Import comics
  for (const item of comics) {
    const dbComic = transformCollectionItemToDbComic(item, profileId);
    const { data: newComic } = await supabase
      .from("comics")
      .insert(dbComic)
      .select()
      .single();

    if (newComic && item.listIds.length > 0) {
      const listInserts = item.listIds
        .map((oldId) => defaultListMap.get(oldId))
        .filter((newId): newId is string => !!newId)
        .map((listId) => ({
          comic_id: newComic.id,
          list_id: listId,
        }));

      if (listInserts.length > 0) {
        await supabase.from("comic_lists").insert(listInserts);
      }
    }
  }

  // Import sales
  for (const sale of sales) {
    await supabase.from("sales").insert({
      user_id: profileId,
      comic_title: sale.comic.title,
      comic_issue_number: sale.comic.issueNumber,
      comic_variant: sale.comic.variant,
      comic_publisher: sale.comic.publisher,
      cover_image_url: sale.coverImageUrl,
      purchase_price: sale.purchasePrice,
      sale_price: sale.salePrice,
      sale_date: sale.saleDate,
      profit: sale.profit,
    });
  }

  return { success: true };
}

// Helper functions
function transformDbComicToCollectionItem(dbComic: Record<string, unknown>): CollectionItem {
  return {
    id: dbComic.id as string,
    comic: {
      id: dbComic.id as string,
      title: dbComic.title as string | null,
      issueNumber: dbComic.issue_number as string | null,
      variant: dbComic.variant as string | null,
      publisher: dbComic.publisher as string | null,
      coverArtist: dbComic.cover_artist as string | null,
      writer: dbComic.writer as string | null,
      interiorArtist: dbComic.interior_artist as string | null,
      releaseYear: dbComic.release_year as string | null,
      confidence: (dbComic.confidence as "high" | "medium" | "low") || "medium",
      isSlabbed: dbComic.is_slabbed as boolean,
      gradingCompany: dbComic.grading_company as "CGC" | "CBCS" | "PGX" | "Other" | null,
      grade: dbComic.grade as string | null,
      isSignatureSeries: dbComic.is_signature_series as boolean,
      signedBy: dbComic.signed_by as string | null,
      priceData: dbComic.price_data as CollectionItem["comic"]["priceData"],
      keyInfo: (dbComic.key_info as string[]) || [],
    },
    coverImageUrl: dbComic.cover_image_url as string,
    conditionGrade: dbComic.condition_grade as number | null,
    conditionLabel: dbComic.condition_label as CollectionItem["conditionLabel"],
    isGraded: dbComic.is_graded as boolean,
    gradingCompany: dbComic.grading_company as string | null,
    purchasePrice: dbComic.purchase_price as number | null,
    purchaseDate: dbComic.purchase_date as string | null,
    notes: dbComic.notes as string | null,
    forSale: dbComic.for_sale as boolean,
    askingPrice: dbComic.asking_price as number | null,
    averagePrice: dbComic.average_price as number | null,
    dateAdded: dbComic.date_added as string,
    listIds: ((dbComic.comic_lists as { list_id: string }[]) || []).map((cl) => cl.list_id),
    isStarred: dbComic.is_starred as boolean,
  };
}

function transformCollectionItemToDbComic(item: CollectionItem, profileId: string) {
  return {
    user_id: profileId,
    title: item.comic.title,
    issue_number: item.comic.issueNumber,
    variant: item.comic.variant,
    publisher: item.comic.publisher,
    cover_artist: item.comic.coverArtist,
    writer: item.comic.writer,
    interior_artist: item.comic.interiorArtist,
    release_year: item.comic.releaseYear,
    confidence: item.comic.confidence,
    is_slabbed: item.comic.isSlabbed,
    grading_company: item.comic.gradingCompany,
    grade: item.comic.grade,
    is_signature_series: item.comic.isSignatureSeries,
    signed_by: item.comic.signedBy,
    price_data: item.comic.priceData,
    cover_image_url: item.coverImageUrl,
    condition_grade: item.conditionGrade,
    condition_label: item.conditionLabel,
    is_graded: item.isGraded,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate,
    notes: item.notes,
    for_sale: item.forSale,
    asking_price: item.askingPrice,
    average_price: item.averagePrice,
    date_added: item.dateAdded,
    is_starred: item.isStarred,
  };
}
