import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 mb-2 text-sm text-base-content/60 hover:text-base-content w-fit"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </Link>
      <h1 className="font-semibold text-2xl">My Profile</h1>
    </div>
  );
}
