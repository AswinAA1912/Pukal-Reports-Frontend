import axios from "axios";
import { getBaseURL } from "../config/portalBaseURL";

export interface stockWiseReport {
    Product_Id: string,
    stock_item_name: string,
    Trans_Date: string,
    Group_Name: string,
    OB_Act_Qty: string,
    Pur_Act_Qty: string,
    Sal_Act_Qty: string,
    Bal_Act_Qty: string,
    OB_Bal_Qty: string,
    Pur_Qty: string,
    Sal_Qty: string,
    Bal_Qty: string,
    Brand: string,
    Group_ST: string,
    Bag: string,
    Stock_Group: string,
    S_Sub_Group_1: string,
    Grade_Item_Group: string,
    Item_Name_Modified: string,
    Date_Added: string,
    POS_Group: string,
    Active: string,
    POS_Item_Name: string,
    Product_Rate: string,
    Stock_Item: string
}

export const godownwisestockreportservice = {
    getGodownwiseReports: (params?: { Fromdate?: string; Todate?: string }) =>
        axios.get<{ success: boolean; data: stockWiseReport[] }>(
            `${getBaseURL()}api/reports/storageStock/godownWiseMobile`,
            { params }
        ),
};

export const itemwisestockreportservice = {
    getItemwiseReports: (params?: { Fromdate?: string; Todate?: string }) =>
        axios.get<{ success: boolean; data: stockWiseReport[] }>(
            `${getBaseURL()}api/reports/storageStock/itemWiseMobile`,
            { params }
        ),
};