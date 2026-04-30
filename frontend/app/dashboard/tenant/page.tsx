"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { leasesApi, maintenanceApi } from "@/lib/api";
import type { LeaseResponse, MaintenanceRequestResponse } from "@/types";
import LeaseCard from "@/components/tenant/lease-card";
import RequestList from "@/components/tenant/request-list";
import NewRequestForm from "@/components/tenant/new-request-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TenantPortalPage() {
    const { user } = useAuth();

    //Data states
    const [leases, setLeases] = useState<LeaseResponse[]>([]);
    const [requests, setRequests] = useState<MaintenanceRequestResponse[]>([]);

    //Loading states 
    const [isLoadingLeases, setIsLoadingLeases] = useState(true);
    const [isLoadingRequests, setIsLoadingRequests] = useState(true);
    const [isTerminating, setIsTerminating] = useState(false);

    // Error state 
    const [error, setError] = useState<string | null>(null);

    // Fetch leases once on mount
    useEffect(() => {
        leasesApi
            .list()
            .then(setLeases)
            .catch(() => setError("Failed to load lease information."))
            .finally(() => setIsLoadingLeases(false));
    }, []);

    // Fetch requests — also called after new request is submitted
    function loadRequests() {
        setIsLoadingRequests(true);
        maintenanceApi
            .list()
            .then(setRequests)
            .catch(() => setError("Failed to load maintenance requests."))
            .finally(() => setIsLoadingRequests(false));
    }

    useEffect(() => {
        loadRequests();
    }, []);

    // Find the one active lease
    const activeLease = leases.find((l) => l.status === "active");

    // Terminate handler 
    async function handleTerminate() {
        if (!activeLease) return;

        const confirmed = window.confirm(
            "Are you sure you want to terminate your lease? This cannot be undone."
        );
        if (!confirmed) return;

        setIsTerminating(true);
        setError(null);

        try {
            await leasesApi.terminate(activeLease.id);
            const updated = await leasesApi.list();
            setLeases(updated);
        } catch {
            setError("Failed to terminate lease. Please try again.");
        } finally {
            setIsTerminating(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Back to dashboard */}
            <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content w-fit"
            >
                <ArrowLeft className="size-4" />
                Dashboard
            </Link>

            {/* Page header */}
            <div>
                <h1 className="font-semibold text-2xl">Tenant Portal</h1>
                <p className="text-base-content/60 text-sm mt-1">
                    Welcome back{user ? `, ${user.fullName}` : ""}. Manage your
                    lease and maintenance requests here.
                </p>
            </div>

            {/* Global error alert */}
            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                </div>
            )}

            {/* Section 1: Lease */}
            <section className="space-y-3">
                <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
                    Your Lease
                </h2>

                {isLoadingLeases ? (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-md" />
                    </div>
                ) : activeLease ? (
                    <LeaseCard
                        lease={activeLease}
                        onTerminate={handleTerminate}
                        isTerminating={isTerminating}
                    />
                ) : (
                    <div className="card bg-base-100 border border-base-300">
                        <div className="card-body text-center text-base-content/40 italic">
                            No active lease found.
                        </div>
                    </div>
                )}
            </section>

            {/* Section 2: Maintenance Requests */}
            <section className="space-y-3">
            <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
                My Maintenance Requests
            </h2>
            <RequestList
                requests={requests}
                isLoading={isLoadingRequests}
                onRefresh={loadRequests}
            />
            </section>

            {/* Section 3: New Request Form */}
            {/* Only show if tenant has an active lease */}
            {activeLease && (
                <section className="space-y-3">
                    <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
                        Submit a Request
                    </h2>
                    <NewRequestForm
                        unitId={activeLease.unitId}
                        onSubmitted={loadRequests}
                    />
                </section>
            )}

        </div>
    );
}