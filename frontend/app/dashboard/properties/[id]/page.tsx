"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { propertiesApi, uploadFileToS3 } from "@/lib/api";
import type { PropertyDetailResponse, UnitResponse } from "@/types";
import {
  ArrowLeft,
  BedDouble,
  Building,
  DollarSign,
  Layers,
  MapPin,
  Plus,
} from "lucide-react";
import Link from "next/link";

const STATUS_CLASSES: Record<string, string> = {
  vacant: "badge-success badge-soft",
  occupied: "badge-neutral badge-soft",
  maintenance: "badge-warning badge-soft",
};

function UnitRow({ unit }: { unit: UnitResponse }) {
  return (
    <tr>
      <td className="font-mono font-medium">{unit.unitNumber}</td>
      <td>{unit.floor ?? "—"}</td>
      <td>{unit.bedrooms}</td>
      <td>
        MYR{" "}
        {unit.rentAmount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
      </td>
      <td>
        <span
          className={`badge badge-sm capitalize ${STATUS_CLASSES[unit.status] ?? "badge-ghost"}`}
        >
          {unit.status}
        </span>
      </td>
    </tr>
  );
}

function AddUnitForm({
  propertyId,
  onAdded,
}: {
  propertyId: string;
  onAdded: (unit: UnitResponse) => void;
}) {
  const [unitNumber, setUnitNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [bedrooms, setBedrooms] = useState("1");
  const [rentAmount, setRentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const unit = await propertiesApi.createUnit(propertyId, {
        unitNumber,
        floor: floor ? parseInt(floor) : null,
        bedrooms: parseInt(bedrooms),
        rentAmount: parseFloat(rentAmount),
      });
      onAdded(unit);
      setUnitNumber("");
      setFloor("");
      setBedrooms("1");
      setRentAmount("");
    } catch {
      setError("Failed to add unit. Check the unit number is unique.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end pt-4 border-t border-base-200"
    >
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Unit Number *</legend>
        <input
          className="input input-bordered input-sm w-full"
          value={unitNumber}
          onChange={(e) => setUnitNumber(e.target.value)}
          placeholder="e.g. A-101"
          required
        />
      </fieldset>
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Floor</legend>
        <input
          type="number"
          className="input input-bordered input-sm w-full"
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          placeholder="e.g. 1"
          min={1}
        />
      </fieldset>
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Bedrooms *</legend>
        <input
          type="number"
          className="input input-bordered input-sm w-full"
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          required
          min={1}
        />
      </fieldset>
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Rent (MYR) *</legend>
        <input
          type="number"
          className="input input-bordered input-sm w-full"
          value={rentAmount}
          onChange={(e) => setRentAmount(e.target.value)}
          placeholder="1500"
          required
          min={0}
          step={0.01}
        />
      </fieldset>
      {error && <p className="col-span-full text-sm text-error">{error}</p>}
      <div className="col-span-full flex justify-end">
        <button
          type="submit"
          className="btn btn-neutral btn-sm"
          disabled={submitting}
        >
          {submitting ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            "Add unit"
          )}
        </button>
      </div>
    </form>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<PropertyDetailResponse | null>(null);
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddUnit, setShowAddUnit] = useState(false);

  useEffect(() => {
    if (!id) return;
    propertiesApi
      .get(id)
      .then((data) => {
        setProperty(data);
        setUnits(data.units);
        if (data.s3PhotoKey) {
          propertiesApi
            .getPhotoUrl(id)
            .then(({ url }) => setPhotoUrl(url))
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (!property) {
    return <div className="alert alert-error">Property not found.</div>;
  }

  const occupied = units.filter((u) => u.status === "occupied").length;
  const vacant = units.filter((u) => u.status === "vacant").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/dashboard/properties"
        className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content w-fit"
      >
        <ArrowLeft className="size-4" /> Properties
      </Link>
      {/* Property header */}
      <div className="card bg-base-100 border border-base-300 overflow-hidden">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={property.name}
            className="w-full h-48 object-cover"
          />
        )}
        <div className="card-body gap-1">
          <h1 className="card-title text-xl">{property.name}</h1>
          <div className="flex items-center gap-1 text-sm text-base-content/60">
            <MapPin className="size-3.5 shrink-0" />
            <span>
              {property.address}, {property.city}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            <div className="flex items-center gap-1.5 text-base-content/70">
              <Building className="size-4" />
              <span>{property.totalUnits} declared units</span>
            </div>
            <div className="flex items-center gap-1.5 text-base-content/70">
              <Layers className="size-4" />
              <span>{units.length} added</span>
            </div>
            <div className="flex items-center gap-1.5 text-success">
              <BedDouble className="size-4" />
              <span>{vacant} vacant</span>
            </div>
            <div className="flex items-center gap-1.5 text-base-content/70">
              <DollarSign className="size-4" />
              <span>{occupied} occupied</span>
            </div>
          </div>
        </div>
      </div>

      {/* Units section */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Units</h2>
            <button
              className="btn btn-sm btn-neutral gap-1"
              onClick={() => setShowAddUnit((v) => !v)}
            >
              <Plus className="size-4" />
              {showAddUnit ? "Cancel" : "Add Unit"}
            </button>
          </div>

          {units.length === 0 && !showAddUnit && (
            <p className="text-sm text-base-content/40 italic">
              No units added yet.
            </p>
          )}

          {units.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Unit #</th>
                    <th>Floor</th>
                    <th>Bedrooms</th>
                    <th>Rent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <UnitRow key={u.id} unit={u} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showAddUnit && (
            <AddUnitForm
              propertyId={id}
              onAdded={(unit) => {
                setUnits((prev) =>
                  [...prev, unit].sort((a, b) =>
                    a.unitNumber.localeCompare(b.unitNumber),
                  ),
                );
                setShowAddUnit(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
