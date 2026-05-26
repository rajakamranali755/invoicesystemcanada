import { createFileRoute } from "@tanstack/react-router";
import { InvoicesListPage } from "@/pages/InvoicesListPage";

export const Route = createFileRoute("/_app/invoices")({
  component: InvoicesListPage,
});