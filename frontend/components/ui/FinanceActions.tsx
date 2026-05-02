"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateInvoiceModal from "@/components/ui/CreateInvoiceModal";
import SetBudgetModal from "@/components/ui/SetBudgetModal";

export default function FinanceActions() {
  const router = useRouter();
  const [showInvoice, setShowInvoice] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

  function handleDone() {
    setShowInvoice(false);
    setShowBudget(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2 shrink-0">
        <button
          className="btn btn-sm btn-outline btn-neutral"
          onClick={() => setShowBudget(true)}
        >
          Set Budget
        </button>
        <button
          className="btn btn-sm btn-neutral"
          onClick={() => setShowInvoice(true)}
        >
          New Invoice
        </button>
      </div>

      {showInvoice && (
        <CreateInvoiceModal
          onCreated={handleDone}
          onClose={() => setShowInvoice(false)}
        />
      )}

      {showBudget && (
        <SetBudgetModal
          onSaved={handleDone}
          onClose={() => setShowBudget(false)}
        />
      )}
    </>
  );
}
