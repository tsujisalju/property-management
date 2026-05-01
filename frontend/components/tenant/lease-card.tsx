"use client";

import type { LeaseResponse } from "@/types";
import { Calendar, DoorClosed, Wallet } from "lucide-react";

interface LeaseCardProps {
    lease: LeaseResponse;
    onTerminate: () => void;
    isTerminating: boolean;
}

export default function LeaseCard({
    lease,
    onTerminate,
    isTerminating,
}: LeaseCardProps) {
    const leaseDisplay = lease as LeaseResponse & {
        unitNumber?: string;
        propertyName?: string;
    };

    return (
        <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body">
                <div className="flex items-center justify-between">
                    <h2 className="card-title text-lg">Active Lease</h2>
                    <span className={`badge capitalize ${lease.status === "active" ? "badge-success" : "badge-ghost"}`}>
                        {lease.status}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-base-200 rounded-full w-9 h-9 justify-center items-center shrink-0">
                            <DoorClosed className="size-4" />
                        </div>
                        <div>
                            <p className="text-xs text-base-content/50">Unit Number</p>
                            <p className="font-medium text-sm">
                                {leaseDisplay.unitNumber || lease.unitId}
                            </p>
                            {leaseDisplay.propertyName && (
                                <p className="text-xs text-base-content/50 mt-0.5">
                                    {leaseDisplay.propertyName}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-base-200 rounded-full w-9 h-9 justify-center items-center shrink-0">
                            <Wallet className="size-4" />
                        </div>
                        <div>
                            <p className="text-xs text-base-content/50">Monthly Rent</p>
                            <p className="font-medium text-sm">RM {lease.monthlyRent}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-base-200 rounded-full w-9 h-9 justify-center items-center shrink-0">
                            <Calendar className="size-4" />
                        </div>
                        <div>
                            <p className="text-xs text-base-content/50">Start Date</p>
                            <p className="font-medium text-sm">
                                {new Date(lease.startDate).toLocaleDateString("en-MY", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-base-200 rounded-full w-9 h-9 justify-center items-center shrink-0">
                            <Calendar className="size-4" />
                        </div>
                        <div>
                            <p className="text-xs text-base-content/50">End Date</p>
                            <p className="font-medium text-sm">
                                {new Date(lease.endDate).toLocaleDateString("en-MY", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {lease.status === "active" && (
                    <div className="card-actions justify-end mt-4">
                        <button
                            className="btn btn-error btn-sm btn-outline"
                            onClick={onTerminate}
                            disabled={isTerminating}
                        >
                            {isTerminating ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                "Terminate Lease"
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}