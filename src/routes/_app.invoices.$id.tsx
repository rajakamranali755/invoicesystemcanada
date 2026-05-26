import { createFileRoute } from "@tanstack/react-router";
import { InvoiceDetailPage } from "@/pages/InvoiceDetailPage";

export const Route = createFileRoute("/_app/invoices/$id")({
  component: InvoiceDetailPage,
});