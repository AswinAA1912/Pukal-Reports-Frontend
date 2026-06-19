import axios from "axios";

export interface CashBoxItem {
    Acc_Id: string;
    Account_name: string;
    Group_Name: string;
    OB_Amount: string;
    Debit_Amt: number;
    Credit_Amt: number;
    Bal_Amount: number;
    CR_DR: string;
    Dr_Amount: number;
    Cr_Amount: number;
}

export const cashboxService = {
    getCashBoxReport: async (params?: {
        Fromdate?: string;
        Todate?: string;
    }): Promise<CashBoxItem[]> => {
        const res = await axios.get<{
            success: boolean;
            data: CashBoxItem[];
        }>(
            `http://192.168.1.5:9001/api/reports/externalAPI/cashbox`,
            // `${getBaseURL()}api/reports/externalAPI/cashbox`,
            { params }
        );
        return res.data.data || [];
    }
};
