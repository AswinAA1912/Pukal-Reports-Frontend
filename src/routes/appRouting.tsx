import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { RequireAuth } from "../auth/requireAuth";
import AppLayout from "../Layout/appLayout";
import Login from "../auth/login";
import GlobalLoader from "../Components/loadingScreen";
import Dashboard from "./dashboard";
import SalesInvoiceReportPage from "../reports/salesinvoicereport";
import OnlineSalesReportPage from "../reports/OnlineSalesReport";
import UnitEconomicsReportPage from "../reports/unitEconomicsReport";
import StockInHandReport from "../reports/stockinhandReport";
import ItemWiseTransaction from "../reports/ItemTransactionList";
import GodownItemWiseTransaction from "../reports/GodownItemTransactionList";
import OnlineSalesReportLOL from "../reports/onlineSalesReportLOL";
import SalesReport from "../reports/SalesAnalyticsReport";
import LedgerWiseItemDetails from "../reports/LedgerWiseItemDetails";
import SalesAnalyticsReportPage from "../reports/GraphicalAnalyticsReport";
import OnlinePurchaseReportPage from "../reports/onlinePurchaseReport";
import SalesOrderReport from "../reports/SaleOrderReport";
import PurchaseOrder from "../reports/PurchaseOrderReport";
import ReportSettings from "../settings/ReportSettings";
import ReportList from "../settings/ReportList";
import StockValueReport from "../reports/stockValueReport";

interface AppRoutingProps {
  setActiveCategory: (category: string) => void;
  globalLoading: boolean;
  loadingOn: () => void;
  loadingOff: () => void;
  activeCategory: string;
}

/* ---------------- URL Sync Handler ---------------- */
const URLSyncHandler: React.FC<{ setActiveCategory: (cat: string) => void }> = ({
  setActiveCategory,
}) => {
  const location = useLocation();

  useEffect(() => {
    const routeToCategory: Record<string, string> = {
      "/dashboard": "Dashboard",
      // "/salesinvoice": "Sales Invoice Report",
      "/salesreport": "Online Sales Report",
      "/uniteconomics": "Unit Economics Report",
      "/": "Login",
    };

    const matched = Object.keys(routeToCategory).find((key) =>
      location.pathname.startsWith(key)
    );

    if (matched) setActiveCategory(routeToCategory[matched]);
  }, [location.pathname, setActiveCategory]);

  return null;
};

/* ---------------- App Routing ---------------- */
const AppRouting: React.FC<AppRoutingProps> = ({
  setActiveCategory,
  globalLoading,
}) => {
  const { token, isInitializing } = useAuth();

  if (isInitializing) return <GlobalLoader loading />;

  return (
    <>
      {globalLoading && <GlobalLoader loading />}
      <URLSyncHandler setActiveCategory={setActiveCategory} />

      <Routes>
        {/* PUBLIC */}
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* SALES INVOICE */}
        <Route
          path="/salesinvoice"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <SalesInvoiceReportPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* ONLINE SALES REPORT */}
        <Route
          path="/salesreport"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <OnlineSalesReportPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/uniteconomics"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <UnitEconomicsReportPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/stockinhand"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <StockInHandReport />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/stockinhand/item-transaction"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <ItemWiseTransaction />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/stockinhand/godown-item-transaction"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <GodownItemWiseTransaction />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/salesreportLOL"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <OnlineSalesReportLOL />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/salesreportlr"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <SalesReport />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/reports/ledger-item"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <LedgerWiseItemDetails />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/graphanalysis"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <SalesAnalyticsReportPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/purchasereport"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <OnlinePurchaseReportPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/saleorder"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <SalesOrderReport />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/purchaseorder"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <PurchaseOrder />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="templateList"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <ReportList />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <ReportSettings />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/stockValue"
          element={
            <RequireAuth>
              <AppLayout
                fullWidth
              >
                <StockValueReport />
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={<Navigate to={token ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </>
  );
};

export default AppRouting;
