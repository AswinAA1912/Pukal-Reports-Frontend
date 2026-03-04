import axios from "axios";
import { getBaseURL } from "../config/portalBaseURL";

/* =========================
   Types
========================= */

export interface SalesReportLedger {
    Ledger_Name: string;
    Ledger_Alias: string;
    Party_Location: string;
    Party_Group: string;
    Ref_Brokers: string;
    Ref_Owners: string;

    Y1: number;
    M6: number;
    M2: number;
    LM: number;
    M3: number;
    M9: number;

    Total_Qty: number;
    Q_Pay_Days: number;
    Freq_Days: number;

    Ledger_Tally_Id: string;
}

export interface SalesReportItem {
    Item_Name: string;
    Item_Name_Modified: string;
    POS_Item_Name: string;

    Product_Id: string;
    Brand: string;
    Group_ST: string;
    Grade_Item_Group: string;

    Y1: number;
    M6: number;
    M2: number;
    LM: number;
    M3: number;
    M9: number;

    Total_Qty: number;
}

/* =========================
   Services
========================= */

/* ---------- ABSTRACT : LEDGER BASED ---------- */

export const SalesReportLedgerService = {
    getReports: (params?: { Fromdate?: string; Todate?: string }) =>
        axios.get<{ success: boolean; data: SalesReportLedger[] }>(
            `${getBaseURL()}api/reports/salesReport/ledger`,
            { params }
        ),
};

/* ---------- EXPANDED : ITEM BASED ---------- */

export const SalesReportItemService = {
    getReports: (params?: { Fromdate?: string; Todate?: string }) =>
        axios.get<{ success: boolean; data: SalesReportItem[] }>(
            `${getBaseURL()}api/reports/salesReport/products`,
            { params }
        ),
};