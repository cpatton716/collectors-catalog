"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { ImageUpload } from "@/components/ImageUpload";
import { ComicDetailsForm } from "@/components/ComicDetailsForm";
import { GuestLimitBanner } from "@/components/GuestLimitBanner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { storage } from "@/lib/storage";
import { ComicDetails, CollectionItem } from "@/types/comic";
import { useToast } from "@/components/Toast";
import { useGuestScans } from "@/hooks/useGuestScans";
import { Loader2, AlertCircle, ArrowLeft, Wand2, Check, Camera, Sparkles, ClipboardCheck, Save, ScanBarcode, PenLine } from "lucide-react";

type ScanState = "upload" | "analyzing" | "review" | "saved" | "error";

const COMIC_FACTS = [
  "Superman's first appearance in Action Comics #1 (1938) sold for $3.2 million in 2014.",
  "Wolverine was originally intended to be an actual wolverine mutated into human form.",
  "Before becoming Iron Man, Tony Stark's original armor was gray, not red and gold.",
  "Spider-Man was rejected by Marvel at first because Stan Lee's publisher thought readers hated spiders.",
  "The first comic book ever published was 'Famous Funnies' in 1933.",
  "Batman was originally going to be called 'Bird-Man' before Bob Kane changed his mind.",
  "Deadpool's real name, Wade Wilson, is a parody of DC's Deathstroke (Slade Wilson).",
  "The X-Men were originally called 'The Merry Mutants' during early development.",
  "Captain America's shield is made of vibranium, the same metal as Black Panther's suit.",
  "Venom was originally designed as a female character before becoming Eddie Brock.",
  "The Joker was almost cut after his first appearance because he was considered too evil.",
  "Wonder Woman was created by the same psychologist who invented the lie detector test.",
  "Hawkeye and Green Arrow debuted the same year (1941) for rival publishers.",
  "The first Black superhero in mainstream comics was Black Panther in 1966.",
  "Ghost Rider was originally going to be called 'Ghost Racer' and ride a horse.",
  "Stan Lee made cameos in Marvel films as a tribute to his co-creation of many characters.",
  "The Hulk was originally gray, but printing issues led Marvel to change him to green.",
  "Wolverine's claws were originally supposed to be part of his gloves, not his body.",
  "Thor's hammer Mjolnir is inscribed: 'Whosoever holds this hammer, if he be worthy...'",
  "The Flash can run faster than the speed of light and has even outrun death itself.",
  "Aquaman can control all sea life because he's telepathic, not because he 'talks to fish.'",
  "The Fantastic Four were Marvel's first superhero team, debuting in 1961.",
  "Robin's original costume was inspired by the legendary Robin Hood.",
  "Magneto and Professor X were inspired by Malcolm X and Martin Luther King Jr.",
  "The rarest comic is Action Comics #1, with fewer than 100 copies known to exist.",
  "Spawn's cape is actually alive and can respond to his thoughts.",
  "Harley Quinn was created for Batman: The Animated Series, not the comics.",
  "The Punisher's skull logo has been worn by military and police units worldwide.",
  "Teenage Mutant Ninja Turtles started as a parody of popular comics like Daredevil.",
  "Thanos was inspired by the DC villain Darkseid and the Freudian concept of Thanatos.",
];

const STEPS = [
  { id: "upload", label: "Upload", icon: Camera },
  { id: "analyzing", label: "AI Analysis", icon: Sparkles },
  { id: "review", label: "Review", icon: ClipboardCheck },
  { id: "saved", label: "Saved", icon: Save },
];

export default function ScanPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isLimitReached, isGuest, incrementScan } = useGuestScans();
  const [state, setState] = useState<ScanState>("upload");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [comicDetails, setComicDetails] = useState<ComicDetails | null>(null);
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedComic, setSavedComic] = useState<CollectionItem | null>(null);
  const [currentFact, setCurrentFact] = useState("");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);

  // Rotate fun facts every 7 seconds during analyzing state
  useEffect(() => {
    if (state === "analyzing") {
      const getRandomFact = () => COMIC_FACTS[Math.floor(Math.random() * COMIC_FACTS.length)];
      setCurrentFact(getRandomFact());

      const interval = setInterval(() => {
        setCurrentFact(getRandomFact());
      }, 7000);

      return () => clearInterval(interval);
    }
  }, [state]);

  const handleImageSelect = async (file: File, preview: string) => {
    setImagePreview(preview);
    setState("analyzing");
    setError("");

    try {
      // Get the media type from the file
      const mediaType = file.type || "image/jpeg";

      // Send to our API for Claude Vision analysis
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: preview,
          mediaType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze image");
      }

      const details = await response.json();
      console.log("Frontend received details:", details);

      // Add an ID to the comic details
      const comicWithId = {
        ...details,
        id: uuidv4(),
      };
      console.log("Setting comicDetails to:", comicWithId);
      setComicDetails(comicWithId);
      setState("review");
    } catch (err) {
      console.error("Error analyzing comic:", err);
      setError(
        err instanceof Error ? err.message : "Failed to analyze comic cover"
      );
      setState("error");
    }
  };

  const handleSave = (itemData: Partial<CollectionItem>) => {
    setIsSaving(true);

    try {
      // Determine if this is a slabbed/graded comic
      const isSlabbed = itemData.isGraded || itemData.comic?.isSlabbed || comicDetails?.isSlabbed;
      const listIds = isSlabbed ? ["collection", "slabbed"] : ["collection"];

      const newItem: CollectionItem = {
        id: uuidv4(),
        comic: itemData.comic || comicDetails!,
        coverImageUrl: imagePreview,
        conditionGrade: itemData.conditionGrade || null,
        conditionLabel: itemData.conditionLabel || null,
        isGraded: itemData.isGraded || false,
        gradingCompany: itemData.gradingCompany || null,
        purchasePrice: itemData.purchasePrice || null,
        purchaseDate: itemData.purchaseDate || null,
        notes: itemData.notes || null,
        forSale: itemData.forSale || false,
        askingPrice: itemData.askingPrice || null,
        averagePrice: null, // Would come from price API in production
        dateAdded: new Date().toISOString(),
        listIds,
        isStarred: false,
      };

      storage.addToCollection(newItem);
      setSavedComic(newItem);
      setState("saved");

      // Increment guest scan count (only counts for non-signed-in users)
      incrementScan();

      showToast(`"${newItem.comic.title}" added to collection!`, "success");
    } catch (err) {
      console.error("Error saving comic:", err);
      setError("Failed to save comic to collection");
      showToast("Failed to save comic", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAnother = () => {
    setState("upload");
    setImagePreview("");
    setComicDetails(null);
    setSavedComic(null);
    setError("");
  };

  const handleCancel = () => {
    setState("upload");
    setImagePreview("");
    setComicDetails(null);
    setError("");
  };

  const handleManualEntry = () => {
    // Create empty comic details for manual entry
    setComicDetails({
      id: uuidv4(),
      title: null,
      issueNumber: null,
      variant: null,
      publisher: null,
      coverArtist: null,
      writer: null,
      interiorArtist: null,
      releaseYear: null,
      confidence: "low",
      isSlabbed: false,
      gradingCompany: null,
      grade: null,
      isSignatureSeries: false,
      signedBy: null,
      priceData: null,
    });
    setState("review");
  };

  const handleBarcodeScan = async (barcode: string) => {
    setIsProcessingBarcode(true);

    try {
      const response = await fetch("/api/barcode-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to look up comic");
      }

      // Set the cover image if provided
      if (data.coverImageUrl) {
        setImagePreview(data.coverImageUrl);
      }

      // Set comic details
      setComicDetails({
        id: uuidv4(),
        title: data.title,
        issueNumber: data.issueNumber,
        variant: data.variant,
        publisher: data.publisher,
        coverArtist: data.coverArtist,
        writer: data.writer,
        interiorArtist: data.interiorArtist,
        releaseYear: data.releaseYear,
        confidence: data.confidence || "high",
        isSlabbed: false,
        gradingCompany: null,
        grade: null,
        isSignatureSeries: false,
        signedBy: null,
        priceData: data.priceData || null,
      });

      setShowBarcodeScanner(false);
      setState("review");
      showToast("Comic found!", "success");
    } catch (err) {
      console.error("Barcode lookup error:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to look up comic",
        "error"
      );
    } finally {
      setIsProcessingBarcode(false);
    }
  };

  const handleRetry = () => {
    if (imagePreview) {
      // Convert data URL back to file for retry
      fetch(imagePreview)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "comic.jpg", { type: "image/jpeg" });
          handleImageSelect(file, imagePreview);
        });
    } else {
      handleCancel();
    }
  };

  const getCurrentStepIndex = () => {
    return STEPS.findIndex((step) => step.id === state);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Scan Comic Cover</h1>
        <p className="text-gray-600 mt-2">
          Upload a photo of your comic book cover to identify and add it to your
          collection.
        </p>
      </div>

      {/* Progress Steps */}
      {state !== "error" && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const currentIndex = getCurrentStepIndex();
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-primary-600 text-white"
                            : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium ${
                        isCurrent ? "text-primary-600" : isCompleted ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded ${
                        index < currentIndex ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload State */}
      {state === "upload" && (
        <>
          {/* Guest scan limit banner */}
          {isGuest && <GuestLimitBanner variant={isLimitReached ? "warning" : "info"} />}

          {isLimitReached ? (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <GuestLimitBanner />
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <ImageUpload onImageSelect={handleImageSelect} />

              {/* Alternative add methods */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500 text-center mb-4">
                  Other ways to add comics:
                </p>
                <div className="flex justify-center gap-12">
                  <button
                    onClick={() => setShowBarcodeScanner(true)}
                    className="flex flex-col items-center justify-center w-44 h-28 bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors border border-primary-200"
                  >
                    <ScanBarcode className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Scan Barcode</span>
                  </button>
                  <button
                    onClick={handleManualEntry}
                    className="flex flex-col items-center justify-center w-44 h-28 bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors border border-primary-200"
                  >
                    <PenLine className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Enter Manually</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Analyzing State */}
      {state === "analyzing" && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Preview */}
            <div className="md:w-1/3">
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imagePreview}
                  alt="Uploaded comic"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Loading State */}
            <div className="md:w-2/3 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                  <Wand2 className="w-10 h-10 text-primary-600" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-24 h-24 text-primary-300 animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-6">
                Analyzing Comic Cover
              </h3>
              <p className="text-gray-600 mt-2">
                Hang tight! We&apos;re identifying the title, issue #, publisher, and more...
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                This should only take a few seconds. Enjoy these fun facts while you wait!
              </div>
              {currentFact && (
                <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-100 max-w-md">
                  <p className="text-sm text-primary-800 italic">
                    &ldquo;{currentFact}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Preview */}
            {imagePreview && (
              <div className="md:w-1/3">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={imagePreview}
                    alt="Uploaded comic"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            <div
              className={`${imagePreview ? "md:w-2/3" : "w-full"} flex flex-col items-center justify-center text-center`}
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-4">
                Analysis Failed
              </h3>
              <p className="text-gray-600 mt-2 max-w-md">{error}</p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleManualEntry}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Enter Manually
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review State */}
      {state === "review" && comicDetails && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Image Preview */}
            <div className="lg:w-1/3 p-6 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-100">
              <div className="sticky top-6">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 shadow-lg">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Comic cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                {!imagePreview && (
                  <div className="mt-4">
                    <ImageUpload
                      onImageSelect={(_, preview) => setImagePreview(preview)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="lg:w-2/3 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Verify Comic Details
              </h2>
              <ComicDetailsForm
                key={comicDetails.id}
                comic={comicDetails}
                coverImageUrl={imagePreview}
                onCoverImageChange={setImagePreview}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={isSaving}
                mode="add"
              />
            </div>
          </div>
        </div>
      )}

      {/* Saved State */}
      {state === "saved" && savedComic && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Preview */}
            <div className="md:w-1/3">
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 shadow-lg">
                <img
                  src={imagePreview}
                  alt="Saved comic"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Success Message */}
            <div className="md:w-2/3 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mt-6">
                Added to Collection!
              </h3>
              <p className="text-gray-600 mt-2">
                <span className="font-semibold">{savedComic.comic.title}</span>
                {savedComic.comic.issueNumber && ` #${savedComic.comic.issueNumber}`}
                {" "}has been saved.
              </p>

              {savedComic.comic.priceData?.estimatedValue && (
                <div className="mt-4 px-4 py-2 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    Estimated Value: <span className="font-bold">${savedComic.comic.priceData.estimatedValue.toFixed(2)}</span>
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
                <button
                  onClick={handleAddAnother}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <Camera className="w-5 h-5" />
                  Scan Another Comic
                </button>
                <button
                  onClick={() => router.push("/collection")}
                  className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  View Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowBarcodeScanner(false)}
          isProcessing={isProcessingBarcode}
        />
      )}
    </div>
  );
}
