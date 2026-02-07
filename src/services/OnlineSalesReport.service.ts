import axios from "axios";
import {getBaseURL} from "../config/portalBaseURL";

/* =========================
   Types
========================= */

export interface OnlineSalesReport {
    Ledger_Date: string;
    Retailer_Name: string;
    voucher_name: string;
    Ref_Brokers: string;
    Party_Location: string;
    Party_District: string;
    invoice_no:string;
    Total_Invoice_value:string;
    Item_Count:String;
    Product_Name:string;
    Bill_Qty:string;
    Rate:string;
    Amount:string;
}



/* =========================
   Service
========================= */

export const OnlineSalesReportService = {
    getReports: (params?: { Fromdate?: string; Todate?: string;invoice_no?: string }) =>
        axios.get<{ success: boolean; data: OnlineSalesReport[] }>(
            `${getBaseURL()}api/reports/externalAPI/onlineSalesReport`,
            { params }
        ),
};

export const OnlineSalesReportItemService = {
    getReportsitem: (params?: { Fromdate?: string; Todate?: string;invoice_no?: string   }) =>
        axios.get<{ success: boolean; data: OnlineSalesReport[] }>(
            `${getBaseURL()}api/reports/externalAPI/onlineSalesReportItem`,
            { params }
        ),
};
