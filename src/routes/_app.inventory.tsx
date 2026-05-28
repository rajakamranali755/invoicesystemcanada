import { createFileRoute } from "@tanstack/react-router";
import { InventoryPage } from "@/pages/InventoryPage";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});