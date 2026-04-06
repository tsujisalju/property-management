"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { propertiesApi, uploadFileToS3 } from "@/lib/api";
import { ArrowLeft, ImagePlus } from "lucide-react";
import Link from "next/link";

export default function NewPropertyPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [totalUnits, setTotalUnits] = useState("1");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // 1. Create the property
      const property = await propertiesApi.create({
        name,
        address,
        city,
        totalUnits: parseInt(totalUnits),
      });

      // 2. If a photo was selected, upload it and save the key
      if (photoFile) {
        const { uploadUrl, key } = await propertiesApi.getPhotoUploadUrl(
          property.id,
          photoFile.type || "image/jpeg",
        );
        await uploadFileToS3(uploadUrl, photoFile);
        await propertiesApi.update(property.id, { s3PhotoKey: key });
      }

      router.push(`/dashboard/properties/${property.id}`);
    } catch {
      setError("Failed to create property. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/dashboard/properties"
        className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content w-fit"
      >
        <ArrowLeft className="size-4" /> Properties
      </Link>

      <div>
        <h1 className="font-bold text-2xl">Add Property</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Fill in the details for your new building.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card bg-base-100 border border-base-300"
      >
        <div className="card-body gap-4">
          {/* Photo upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Photo{" "}
              <span className="text-base-content/40 font-normal">
                (optional)
              </span>
            </label>
            <label className="cursor-pointer block">
              <div
                className={`rounded-xl border-2 border-dashed border-base-300 hover:border-primary transition overflow-hidden ${photoPreview ? "h-40" : "h-28 flex items-center justify-center"}`}
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-base-content/30 p-4">
                    <ImagePlus className="size-7" />
                    <span className="text-sm">Click to upload a photo</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
            {photoFile && (
              <p className="text-xs text-base-content/50 mt-1">
                {photoFile.name}
              </p>
            )}
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Property Name *</legend>
            <input
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sutera Apartment"
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Address *</legend>
            <input
              className="input input-bordered w-full"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Jalan Sutera 1, Taman Sutera"
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">City *</legend>
            <input
              className="input input-bordered w-full"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Johor Bahru"
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Total Units *</legend>
            <input
              type="number"
              className="input input-bordered w-full"
              value={totalUnits}
              onChange={(e) => setTotalUnits(e.target.value)}
              min={1}
              required
            />
            <p className="fieldset-label">
              Declared unit count for this property.
            </p>
          </fieldset>

          {error && (
            <div className="alert alert-error text-sm py-2">
              <span>{error}</span>
            </div>
          )}

          <div className="card-actions justify-end pt-2">
            <Link href="/dashboard/properties" className="btn btn-ghost btn-sm">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-neutral btn-sm"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner loading-xs" />{" "}
                  Saving…
                </>
              ) : (
                "Create property"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
