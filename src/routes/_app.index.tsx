import { createFileRoute } from "@tanstack/react-router";
import { CompaniesPage } from "@/pages/CompaniesPage";

export const Route = createFileRoute("/_app/")({
  component: CompaniesPage,
});