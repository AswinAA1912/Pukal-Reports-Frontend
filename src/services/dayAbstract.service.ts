import axios from "axios";
import { getBaseURL } from "../config/portalBaseURL";

/* ----------------  DATASET ---------------- */

export interface DayAbstractData1 {
    Trans_Type: string;
    Trans_Amount: number;
}


export interface DayAbstractData2 {
    Trans_Type: string;
    Trans_Amount: number;
    Trans_Count: number;
}

export interface DayAbstractData3 {
    ledger_name: string;
    group_name: string;
    Master_Name: string;
    Trans_Type: string;
    Credit_Amount: number;
    Debit_Amount: number;
}

export interface DayAbstractData4 {
    Trans_Type: string;
    Trans_Amount: number;
    Trans_Count: number;
}

/* ---------------- FINAL RESPONSE TYPE ---------------- */

export interface DayAbstractReportResponse {
    Data1: DayAbstractData1[];
    Data2: DayAbstractData2[];
    Data3: DayAbstractData3[];
    Data4: DayAbstractData4[];
}

/* ---------------- DAY ABSTRACT REPORT SERVICE ---------------- */

export const DayAbstractReportService = {
    getDayAbstractReport: async (params?: {
        Predate?: string;
        Fromdate?: string;
        Todate?: string;
    }): Promise<DayAbstractReportResponse> => {
        const res = await axios.get<{
            success: boolean;
            data: any;
        }>(
            'http://192.168.1.5:9001/api/reports/externalAPI/dayAbstract',
            // `${getBaseURL()}api/reports/externalAPI/dayAbstract`,
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
        };
    },
};