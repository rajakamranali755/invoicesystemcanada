import { createFileRoute } from "@tanstack/react-router";
import { CompanyDetailPage } from "@/pages/CompanyDetailPage";

export const Route = createFileRoute("/_app/companies/$id")({
  component: CompanyDetailPage,
});