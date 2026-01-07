import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="flex justify-center py-4">
      <UserProfile
        appearance={{
          elements: {
            rootBox: "w-full max-w-3xl",
            card: "shadow-sm",
          },
        }}
      />
    </div>
  );
}
