import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { CompaniesPage } from "@/pages/CompaniesPage";
import { CompanyDetailPage } from "@/pages/CompanyDetailPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { InvoiceDetailPage } from "@/pages/InvoiceDetailPage";
import { InvoicesListPage } from "@/pages/InvoicesListPage";
import { SalesPage } from "@/pages/SalesPage";
import { UnsoldReportPage } from "@/pages/UnsoldReportPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<CompaniesPage />} />
        <Route path="/invoices" element={<InvoicesListPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
        <Route path="/reports/unsold" element={<UnsoldReportPage />} />
      </Route>
    </Routes>
  );
}