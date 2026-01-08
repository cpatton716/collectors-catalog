import { CollectionItem, UserList, SaleRecord } from "@/types/comic";

const COLLECTION_KEY = "comic_collection";
const LISTS_KEY = "comic_lists";
const SALES_KEY = "comic_sales";
const RECENTLY_VIEWED_KEY = "comic_recently_viewed";

// Default lists that every user starts with
const DEFAULT_LISTS: UserList[] = [
  {
    id: "collection",
    name: "My Collection",
    description: "All comics in your collection",
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "want-list",
    name: "Want List",
    description: "Comics you want to acquire",
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "for-sale",
    name: "For Sale",
    description: "Comics you're selling",
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "slabbed",
    name: "Slabbed",
    description: "Graded/slabbed comics",
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

export const storage = {
  // Collection methods
  getCollection(): CollectionItem[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(COLLECTION_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveCollection(collection: CollectionItem[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  },

  addToCollection(item: CollectionItem): CollectionItem[] {
    const collection = this.getCollection();
    collection.unshift(item);
    this.saveCollection(collection);
    return collection;
  },

  updateCollectionItem(
    id: string,
    updates: Partial<CollectionItem>
  ): CollectionItem[] {
    const collection = this.getCollection();
    const index = collection.findIndex((item) => item.id === id);
    if (index !== -1) {
      collection[index] = { ...collection[index], ...updates };
      this.saveCollection(collection);
    }
    return collection;
  },

  removeFromCollection(id: string): CollectionItem[] {
    const collection = this.getCollection().filter((item) => item.id !== id);
    this.saveCollection(collection);
    return collection;
  },

  getCollectionItem(id: string): CollectionItem | undefined {
    return this.getCollection().find((item) => item.id === id);
  },

  // List methods
  getLists(): UserList[] {
    if (typeof window === "undefined") return DEFAULT_LISTS;
    const data = localStorage.getItem(LISTS_KEY);
    if (!data) {
      this.saveLists(DEFAULT_LISTS);
      return DEFAULT_LISTS;
    }
    return JSON.parse(data);
  },

  saveLists(lists: UserList[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  },

  addList(list: UserList): UserList[] {
    const lists = this.getLists();
    lists.push(list);
    this.saveLists(lists);
    return lists;
  },

  createList(name: string): UserList {
    const newList: UserList = {
      id: `list-${Date.now()}`,
      name,
      description: "",
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    this.addList(newList);
    return newList;
  },

  removeList(id: string): UserList[] {
    const lists = this.getLists().filter(
      (list) => list.id !== id || list.isDefault
    );
    this.saveLists(lists);
    return lists;
  },

  // Get items in a specific list
  getItemsInList(listId: string): CollectionItem[] {
    const collection = this.getCollection();
    if (listId === "collection") {
      return collection;
    }
    return collection.filter((item) => item.listIds.includes(listId));
  },

  // Add item to a list
  addItemToList(itemId: string, listId: string): CollectionItem[] {
    const collection = this.getCollection();
    const index = collection.findIndex((item) => item.id === itemId);
    if (index !== -1 && !collection[index].listIds.includes(listId)) {
      collection[index].listIds.push(listId);
      this.saveCollection(collection);
    }
    return collection;
  },

  // Remove item from a list
  removeItemFromList(itemId: string, listId: string): CollectionItem[] {
    const collection = this.getCollection();
    const index = collection.findIndex((item) => item.id === itemId);
    if (index !== -1) {
      collection[index].listIds = collection[index].listIds.filter(
        (id) => id !== listId
      );
      this.saveCollection(collection);
    }
    return collection;
  },

  // Calculate collection stats
  getCollectionStats(): {
    totalComics: number;
    totalValue: number;
    forSaleCount: number;
  } {
    const collection = this.getCollection();
    return {
      totalComics: collection.length,
      totalValue: collection.reduce(
        (sum, item) => sum + (item.comic.priceData?.estimatedValue || item.purchasePrice || 0),
        0
      ),
      forSaleCount: collection.filter((item) => item.forSale).length,
    };
  },

  // Sales methods
  getSales(): SaleRecord[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(SALES_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSales(sales: SaleRecord[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  },

  recordSale(item: CollectionItem, salePrice: number, buyerId?: string): SaleRecord {
    const saleRecord: SaleRecord = {
      id: `sale-${Date.now()}`,
      comic: item.comic,
      coverImageUrl: item.coverImageUrl,
      purchasePrice: item.purchasePrice,
      salePrice,
      saleDate: new Date().toISOString(),
      profit: salePrice - (item.purchasePrice || 0),
      buyerId: buyerId || null,
    };

    const sales = this.getSales();
    sales.unshift(saleRecord);
    this.saveSales(sales);

    // Remove from collection
    this.removeFromCollection(item.id);

    return saleRecord;
  },

  getSalesStats(): {
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
  } {
    const sales = this.getSales();
    return {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + sale.salePrice, 0),
      totalProfit: sales.reduce((sum, sale) => sum + sale.profit, 0),
    };
  },

  // Recently viewed methods
  getRecentlyViewed(): string[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return data ? JSON.parse(data) : [];
  },

  addToRecentlyViewed(itemId: string): void {
    if (typeof window === "undefined") return;
    const recentIds = this.getRecentlyViewed();
    // Remove if already exists
    const filtered = recentIds.filter((id) => id !== itemId);
    // Add to front
    filtered.unshift(itemId);
    // Keep only last 10
    const trimmed = filtered.slice(0, 10);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(trimmed));
  },

  getRecentlyViewedItems(): CollectionItem[] {
    const recentIds = this.getRecentlyViewed();
    const collection = this.getCollection();
    return recentIds
      .map((id) => collection.find((item) => item.id === id))
      .filter((item): item is CollectionItem => item !== undefined)
      .slice(0, 5);
  },
};
