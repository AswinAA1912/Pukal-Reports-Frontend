import axios from "axios";
import { getBaseURL } from "../config/portalBaseURL";

/* ----------------  DATASET ---------------- */

export interface StockAbstractData1 {
    Trans_Type: string;
    Trans_Amount: number;
}


export interface StockAbstractData2 {
    Trans_Type: string;
    Trans_Amount: number;
    Trans_Count: number;
}

export interface StockAbstractData3 {
    ledger_name: string;
    group_name: string;
    Master_Name: string;
    Trans_Type: string;
    Credit_Amount: number;
    Debit_Amount: number;
}

export interface StockAbstractData4 {
    Trans_Type: string;
    Trans_Amount: number;
    Trans_Count: number;
}

export interface StockAbstractData5 {
    Dr_Amount: number;
    Cr_Amount: number;
    OB_Amount: number;
    OPB_Amount: number;
    Credit_Amt: number;
    Debit_Amt: number;
    Bal_Amount: number;
}

export interface StockAbstractData6 {
    Dr_Amount: number;
    Cr_Amount: number;
    OB_Amount: number;
    OPB_Amount: number;
    Credit_Amt: number;
    Debit_Amt: number;
    Bal_Amount: number;
}
export interface StockAbstractData7 {
    Trans_Type: string;
    Credit_Amount: number;
    Debit_Amount: number;
    Credit_Amount_1: number;
    Debit_Amount_1: number;
}

export interface StockAbstractData8 {
    Trans_Type: string;
    Credit_Amount: number;
    Debit_Amount: number;
    Credit_Amount_1: number;
    Debit_Amount_1: number;
}

/* ---------------- FINAL RESPONSE TYPE ---------------- */

export interface StockAbstractReportResponse {
    Data1: StockAbstractData1[];
    Data2: StockAbstractData2[];
    Data3: StockAbstractData3[];
    Data4: StockAbstractData4[];
    Data5: StockAbstractData5[];
    Data6: StockAbstractData6[];
    Data7: StockAbstractData7[];
    Data8: StockAbstractData8[];
}

/* ---------------- STOCK ABSTRACT REPORT SERVICE ---------------- */

export const StockAbstractReportService = {
    getStockAbstractReport: async (params?: {
        Predate?: string;
        Fromdate?: string;
        Todate?: string;
    }): Promise<StockAbstractReportResponse> => {
        const res = await axios.get<{
            success: boolean;
            data: any;
        }>(
            'http://192.168.1.5:9001/api/reports/externalAPI/dayStockAbstract',
            // `${getBaseURL()}api/reports/externalAPI/dayStockAbstract`,
            {
                params,
            }
        );

        const data = res.data.data || {};

        return {
            Data1:
                data.Data1 ||
                data["Data1"] ||
                [],

            Data2:
                data.Data2 ||
                data["Data2"] ||
                [],

            Data3:
                data.Data3 ||
                data["Data3"] ||
                [],

            Data4:
                data.Data4 ||
                data["Data4"] ||
                [],

            Data5:
                data.Data5 ||
                data["Data5"] ||
                [],

            Data6:
                data.Data6 ||
                data["Data6"] ||
                [],

            Data7:
                data.Data7 ||
                data["Data7"] ||
                [],

            Data8:
                data.Data8 ||
                data["Data8"] ||
                [],
        };
    },
};