// Static fallback list for Professor's Hottest Books
// Generated: January 9, 2026
// NOTE: Re-enable live API call before production launch (see BACKLOG.md)

export interface StaticHotBook {
  rank: number;
  title: string;
  issueNumber: string;
  publisher: string;
  year: string;
  keyFacts: string[];
  whyHot: string;
  priceRange: {
    low: number;
    mid: number;
    high: number;
  };
  coverImageUrl?: string;
}

export const STATIC_HOT_BOOKS: StaticHotBook[] = [
  {
    rank: 1,
    title: "Fantastic Four",
    issueNumber: "5",
    publisher: "Marvel Comics",
    year: "1962",
    keyFacts: ["First appearance of Doctor Doom", "Second appearance of Fantastic Four"],
    whyHot:
      "Doctor Doom's upcoming MCU debut and consistent collector demand for this classic villain key",
    priceRange: { low: 1200, mid: 2500, high: 5000 },
    coverImageUrl:
      "https://comicvine.gamespot.com/a/uploads/scale_medium/10/108995/3593371-ff%20005_cf_bk_hk.jpg",
  },
  {
    rank: 2,
    title: "X-Men",
    issueNumber: "4",
    publisher: "Marvel Comics",
    year: "1964",
    keyFacts: [
      "First appearance of Scarlet Witch and Quicksilver",
      "First appearance of Brotherhood of Evil Mutants",
    ],
    whyHot: "Speculation around X-Men MCU integration and Scarlet Witch's continued popularity",
    priceRange: { low: 800, mid: 1500, high: 3000 },
    coverImageUrl: "https://comicvine.gamespot.com/a/uploads/scale_medium/0/5344/1356279-01.jpg",
  },
  {
    rank: 3,
    title: "Ultimate Fallout",
    issueNumber: "4",
    publisher: "Marvel Comics",
    year: "2011",
    keyFacts: ["First appearance of Miles Morales as Spider-Man"],
    whyHot: "Miles Morales live-action movie rumors and Spider-Verse popularity",
    priceRange: { low: 150, mid: 300, high: 600 },
    coverImageUrl: "https://comicvine.gamespot.com/a/uploads/scale_medium/6/67663/1966577-04a.jpg",
  },
  {
    rank: 4,
    title: "Ms. Marvel",
    issueNumber: "1",
    publisher: "Marvel Comics",
    year: "2014",
    keyFacts: ["First appearance of Kamala Khan as Ms. Marvel"],
    whyHot: "Disney+ series success and upcoming movie 'The Marvels' featuring the character",
    priceRange: { low: 80, mid: 150, high: 300 },
    coverImageUrl:
      "https://comicvine.gamespot.com/a/uploads/scale_medium/0/4/15354-2910-17111-1-ms-marvel.jpg",
  },
  {
    rank: 5,
    title: "New Mutants",
    issueNumber: "98",
    publisher: "Marvel Comics",
    year: "1991",
    keyFacts: ["First appearance of Deadpool", "First appearance of Domino"],
    whyHot: "Deadpool 3 confirmed for MCU with Ryan Reynolds returning",
    priceRange: { low: 400, mid: 700, high: 1200 },
  },
  {
    rank: 6,
    title: "Iron Man",
    issueNumber: "55",
    publisher: "Marvel Comics",
    year: "1973",
    keyFacts: ["First appearance of Thanos", "First appearance of Drax the Destroyer"],
    whyHot: "Thanos remains popular post-Endgame, speculation about cosmic MCU future",
    priceRange: { low: 600, mid: 1000, high: 1800 },
    coverImageUrl:
      "https://comicvine.gamespot.com/a/uploads/scale_medium/11/117763/2844051-ironman055.jpg",
  },
  {
    rank: 7,
    title: "Teenage Mutant Ninja Turtles",
    issueNumber: "1",
    publisher: "Mirage Studios",
    year: "1984",
    keyFacts: ["First appearance of TMNT", "Origin story of the Teenage Mutant Ninja Turtles"],
    whyHot: "New TMNT movie announcements and 40th anniversary approaching",
    priceRange: { low: 1500, mid: 3000, high: 6000 },
    coverImageUrl:
      "https://comicvine.gamespot.com/a/uploads/scale_medium/0/4/71033-11889-104031-1-teenage-mutant-ninja.jpg",
  },
  {
    rank: 8,
    title: "Wolverine",
    issueNumber: "1",
    publisher: "Marvel Comics",
    year: "1982",
    keyFacts: ["First solo Wolverine limited series", "Key Wolverine collectible"],
    whyHot: "Hugh Jackman returning as Wolverine in Deadpool 3, renewed interest in character",
    priceRange: { low: 60, mid: 120, high: 250 },
    coverImageUrl:
      "https://comicvine.gamespot.com/a/uploads/scale_medium/11161/111615891/9300027-3983472080-30841.jpg",
  },
  {
    rank: 9,
    title: "Saga",
    issueNumber: "1",
    publisher: "Image Comics",
    year: "2012",
    keyFacts: ["First issue of acclaimed series by Brian K. Vaughan and Fiona Staples"],
    whyHot: "Series return from hiatus and continued speculation about TV/movie adaptation",
    priceRange: { low: 100, mid: 200, high: 400 },
    coverImageUrl:
      "https://comicvine.gamespot.com/a/uploads/scale_medium/0/4/62641-3239-95637-1-saga-of-crystar-cry.jpg",
  },
  {
    rank: 10,
    title: "Captain Marvel",
    issueNumber: "1",
    publisher: "Marvel Comics",
    year: "1968",
    keyFacts: ["First appearance of Mar-Vell Captain Marvel", "First Silver Age Captain Marvel"],
    whyHot: "The Marvels movie release and cosmic MCU expansion driving interest",
    priceRange: { low: 200, mid: 400, high: 800 },
    coverImageUrl:
      "https://comicvine.gamespot.com/a/uploads/scale_medium/0/4/7691-2326-8486-1-captain-marvel.jpg",
  },
];
