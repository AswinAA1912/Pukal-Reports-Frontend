import axios from "axios";
import { getBaseURL } from "../config/portalBaseURL";

/* ---------------- SUMMARY DATASET ---------------- */

export interface OnlinePaymentSummary {
    pay_id: string;
    year_id: number;
    payment_voucher_type_id: number;
    payment_sno: number;
    payment_invoice_no: string;
    payment_date: string;

    pay_bill_type: string;

    credit_ledger: number;
    credit_ledger_name: string;
    credit_amount: number;

    debit_ledger: number;
    debit_ledger_name: string;
    debit_amount: number;

    remarks: string;
    transaction_type: string;

    Month_No: number;
    Invoice_Month: string;
    Invoice_Year: number;
    Month_Year: string;

    voucher_name: string;
    Created_By: string;

    [key: string]: any; // flexible for remaining fields
}

/* ---------------- EXPENSE DATASET ---------------- */

export interface ExpenseAccount {
    Acc_Id: string;
    Account_name: string;
    Group_Name: string;
    Group_Id: string;
}

/* ---------------- FINAL RESPONSE TYPE ---------------- */

export interface OnlinePaymentReportResponse {
    Summary: OnlinePaymentSummary[];
    IndirectExpense: ExpenseAccount[];
    DirectExpense: ExpenseAccount[];
}

/* ---------------- SERVICE ---------------- */

export const onlinePaymentReportService = {
    getOnlinePaymentReport: async (params?: {
        Fromdate?: string;
        Todate?: string;
    }): Promise<OnlinePaymentReportResponse> => {
        const res = await axios.get<{
            success: boolean;
            data: any;
        }>(
            // `http://192.168.1.5:9001/api/reports/externalAPI/expenses`,
            `${getBaseURL()}api/reports/externalAPI/expenses`,
            { params }
        );

        const data = res.data.data || {};

        return {
            Summary: data.Summary || [],

            IndirectExpense:
                data.IndirectExpense ||
                data["Indirect Expense"] ||
                data["Indirect Expense "] ||
                [],

            DirectExpense:
                data.DirectExpense ||
                data["Direct Expense"] ||
                [],
        };
    },
};