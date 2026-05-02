"use client";

import { useRouter } from "next/navigation";
import InvoiceTable from "@/components/ui/invoicetable";
import type { InvoiceResponse } from "@/types";

interface Props {
  invoices: InvoiceResponse[];
}

export default function InvoiceTableManager({ invoices }: Props) {
  const router = useRouter();
  return (
    <InvoiceTable
      invoices={invoices}
      onInvoiceUpdate={() => router.refresh()}
    />
  );
}
