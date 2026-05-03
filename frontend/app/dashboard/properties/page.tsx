"use client";

import { useEffect, useState } from "react";
import { propertiesApi } from "@/lib/api";
import type { PropertyResponse } from "@/types";
import { Building, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function PropertyCard({ property }: { property: PropertyResponse }) {
  return (
    <Link href={`/dashboard/properties/${property.id}`}>
      <div className="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition cursor-pointer h-full overflow-hidden">
        <div className="relative h-36 bg-base-200 overflow-hidden">
          {property.s3PhotoKey ? (
            <PhotoThumbnail propertyId={property.id} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base-content/20">
              <Building className="size-10" />
            </div>
          )}
        </div>
        <div className="card-body gap-1 pt-3">
          <h2 className="card-title text-base">{property.name}</h2>
          <div className="flex items-center gap-1 text-sm text-base-content/60">
            <MapPin className="size-3.5 shrink-0" />
            <span>{property.city}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge badge-sm badge-soft badge-neutral">
              {property.totalUnits} units
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PhotoThumbnail({ propertyId }: { propertyId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    propertiesApi
      .getPhotoUrl(propertyId)
      .then(({ url }) => setUrl(url))
      .catch(() => {});
  }, [propertyId]);

  if (!url) return <div className="w-full h-full bg-base-200" />;
  return (
    <Image
      src={url}
      alt="Property"
      className="w-full h-full object-cover"
      fill
    />
  );
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    propertiesApi
      .list()
      .then(setProperties)
      .catch(() => setError("Failed to load properties."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Properties</h1>
          <p className="text-base-content/60 text-sm mt-1">
            Manage your buildings and units
          </p>
        </div>
        <Link
          href="/dashboard/properties/new"
          className="btn btn-neutral btn-sm gap-1"
        >
          <Plus className="size-4" /> Add Property
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && properties.length === 0 && (
        <div className="text-center py-16 text-base-content/40">
          <Building className="size-10 mx-auto mb-3 opacity-30" />
          <p>No properties yet. Add your first one.</p>
        </div>
      )}

      {!loading && !error && properties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
