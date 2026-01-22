import { getHotBooks } from "@/lib/hotBooksData";
import HotBooksClient from "./HotBooksClient";

// ISR: Revalidate every hour (3600 seconds)
export const revalidate = 3600;

export default async function HottestBooksPage() {
  // Fetch hot books server-side with ISR caching
  const books = await getHotBooks();

  return <HotBooksClient initialBooks={books} />;
}
