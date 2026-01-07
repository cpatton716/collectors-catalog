# Comic Collector App

A proof-of-concept web application that uses AI (Claude Vision) to identify comic book covers and manage your collection.

## Features

- **AI-Powered Recognition**: Upload a photo of any comic book cover and the app will automatically identify:
  - Title
  - Issue number
  - Publisher
  - Cover artist
  - Writer
  - Interior artist
  - Release year
  - Variant information

- **Collection Management**:
  - Add comics to your collection
  - View in grid or list mode
  - Filter by custom lists (Collection, Want List, For Sale)
  - Search by title, publisher, or writer
  - Sort by date, title, value, or issue number

- **Condition Tracking**:
  - Support for both simple labels (Poor to Mint) and CGC/CBCS numeric grades
  - Track professionally graded comics

- **For Sale Listings**:
  - Mark comics for sale with asking price
  - Track items in your "For Sale" list

## Prerequisites

Before you begin, make sure you have:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **An Anthropic API Key**
   - Sign up at: https://console.anthropic.com/
   - Create an API key in your account settings

## Setup Instructions

### Step 1: Navigate to the project directory

```bash
cd comic-collector-app
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Set up environment variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

### Step 4: Run the development server

```bash
npm run dev
```

### Step 5: Open in browser

Visit [http://localhost:3000](http://localhost:3000) in your web browser.

## How to Use

### Scanning a Comic

1. Click "Scan a Comic" on the home page or navigate to `/scan`
2. Drag and drop an image of your comic cover, or click to select a file
3. Wait for the AI to analyze the cover (usually 2-5 seconds)
4. Review the identified details and make any corrections
5. Add condition, purchase price, and other optional information
6. Click "Add to Collection" to save

### Viewing Your Collection

1. Click "My Collection" in the navigation
2. Use the filter dropdown to switch between lists
3. Use the search bar to find specific comics
4. Click the grid/list icons to toggle view mode
5. Click any comic to view details (full editing coming soon)

### Manual Entry

If the AI can't identify a comic:
1. Go to the scan page
2. Click "Enter details manually" below the upload area
3. Fill in the comic information by hand
4. Optionally upload an image of the cover
5. Save to your collection

## Project Structure

```
comic-collector-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts      # Claude Vision API endpoint
│   │   ├── collection/
│   │   │   └── page.tsx          # Collection view page
│   │   ├── scan/
│   │   │   └── page.tsx          # Comic scanning page
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   ├── components/
│   │   ├── ComicCard.tsx         # Grid view card
│   │   ├── ComicDetailsForm.tsx  # Add/edit form
│   │   ├── ComicListItem.tsx     # List view item
│   │   ├── ImageUpload.tsx       # Drag-drop uploader
│   │   └── Navigation.tsx        # Top navigation bar
│   ├── lib/
│   │   └── storage.ts            # Local storage utilities
│   └── types/
│       └── comic.ts              # TypeScript type definitions
├── .env.example                  # Environment variables template
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind CSS config
└── tsconfig.json                 # TypeScript config
```

## Data Storage

This proof-of-concept uses browser localStorage for data persistence. Your collection data is stored locally in your browser and will persist between sessions.

**Note**: Clearing your browser data will delete your collection. In a production app, this would be replaced with a proper database (like Supabase).

## Limitations (POC)

This is a proof-of-concept with some limitations:

- **No user accounts**: Data is stored locally per browser
- **No price data**: Average sales prices are not fetched (would require eBay API integration)
- **No marketplace**: Buying/selling features are placeholders
- **No image storage**: Images are stored as base64 in localStorage (not scalable)
- **No price history charts**: Would require historical data collection

## Next Steps for Production

To turn this into a full production app, you would need to:

1. **Add Supabase** for database, authentication, and file storage
2. **Integrate eBay API** for real-time price data
3. **Add Stripe Connect** for marketplace payments
4. **Implement user profiles** with registration/login
5. **Add price history tracking** with charts
6. **Deploy to Vercel** for hosting

## Tech Stack

- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **AI**: Claude Vision API (Anthropic)
- **Icons**: Lucide React
- **Language**: TypeScript

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"
Make sure you've created `.env.local` with your API key and restarted the dev server.

### Images not analyzing
- Ensure the image is JPEG, JPG, or PNG
- Image should be under 10MB
- Make sure the comic cover is clearly visible

### Collection not saving
- Check that localStorage is enabled in your browser
- Try clearing localStorage and starting fresh

## License

MIT
