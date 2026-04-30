"use client";

import { useState } from "react";
import { maintenanceApi, uploadFileToS3 } from "@/lib/api";
import { Plus } from "lucide-react";

interface NewRequestFormProps {
    unitId: string;
    onSubmitted: () => void;
}

function normalizeImageContentType(file: File): string {
    const type = file.type?.toLowerCase().trim();
    if (type.startsWith("image/")) return type;
    return "image/jpeg";
}

export default function NewRequestForm({
    unitId,
    onSubmitted,
}: NewRequestFormProps) {
    // Form field states
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("general");
    const [priority, setPriority] = useState("medium");
    const [photo, setPhoto] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);

    // UI states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            // ── Step 1: Create the maintenance request ──────────────────────────
            // Returns the new request's ID (a string UUID)
            const newRequestId = await maintenanceApi.create({
                unitId,
                title: title.trim(),
                description: description.trim() || undefined,
                category,
                priority,
            });
            // Step 2: Upload photo to S3 if one was attached
            if (photo && newRequestId) {
            const contentType = normalizeImageContentType(photo);
            const { uploadUrl, key } = await maintenanceApi.getPhotoUploadUrl(
                newRequestId,
                contentType
            );

            if (!uploadUrl || !key) {
                throw new Error("Photo upload URL response is missing required fields.");
            }

            await uploadFileToS3(uploadUrl, photo, contentType);
            await maintenanceApi.tenantUpdate(newRequestId, { s3PhotoKey: key });
            }

            // ── Step 3: Reset form + notify parent ─────────────────────────────
            setTitle("");
            setDescription("");
            setCategory("general");
            setPriority("medium");
            setPhoto(null);
            setFileInputKey((prev) => prev + 1);
            setSuccess(true);

            // Tell the parent page to reload the requests list
            onSubmitted();

            // Hide success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);

        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to submit request. Please try again.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body">

                {/* Header */}
                <h2 className="card-title text-lg flex items-center gap-2">
                    <Plus className="size-5" />
                    New Maintenance Request
                </h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">

                    {/* Title — required */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Title *</legend>
                        <input
                            type="text"
                            required
                            className="input input-bordered w-full"
                            placeholder="e.g. Leaking tap in bathroom"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </fieldset>

                    {/* Description — optional */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Description</legend>
                        <textarea
                            className="textarea textarea-bordered w-full resize-none"
                            rows={3}
                            placeholder="Describe the issue in detail..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </fieldset>

                    {/* Category + Priority — side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        <fieldset className="fieldset">
                            <legend className="fieldset-legend">Category</legend>
                            <select
                                className="select select-bordered w-full"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                disabled={isSubmitting}
                            >
                                <option value="general">General</option>
                                <option value="plumbing">Plumbing</option>
                                <option value="electrical">Electrical</option>
                                <option value="hvac">HVAC</option>
                            </select>
                        </fieldset>

                        <fieldset className="fieldset">
                            <legend className="fieldset-legend">Priority</legend>
                            <select
                                className="select select-bordered w-full"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                disabled={isSubmitting}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </fieldset>
                    </div>

                    {/* Photo upload — optional */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Photo (optional)</legend>
                        <input
                            key={fileInputKey}
                            type="file"
                            accept="image/*"
                            className="file-input file-input-bordered w-full"
                            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                            disabled={isSubmitting}
                        />
                        {photo && (
                            <p className="text-xs text-base-content/50 mt-1">
                                Selected: {photo.name} ({(photo.size / 1024).toFixed(1)} KB)
                            </p>
                        )}
                    </fieldset>

                    {/* Error message */}
                    {error && (
                        <div className="alert alert-error text-sm py-2">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success message */}
                    {success && (
                        <div className="alert alert-success text-sm py-2">
                            <span>Request submitted successfully!</span>
                        </div>
                    )}

                    {/* Submit button */}
                    <div className="card-actions justify-end">
                        <button
                            type="submit"
                            className="btn btn-neutral"
                            disabled={isSubmitting || !title.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-sm" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Request"
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}