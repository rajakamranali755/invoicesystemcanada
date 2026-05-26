import { createFileRoute } from "@tanstack/react-router";
import { UnsoldReportPage } from "@/pages/UnsoldReportPage";

export const Route = createFileRoute("/_app/reports/unsold")({
  component: UnsoldReportPage,
});