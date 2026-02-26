import axios from "axios";
import { getBaseURL } from "../config/portalBaseURL";

/* =========================
   Types
========================= */

export interface UnitEconomicsReport {
  Trans_Date: string;
  Product_Id: number;
  Product_Name: string;
  Bill_Qty: number;
  Rate: number;
  Amount: number;
  COGS: number;
  COGS_Amount: number;

  // Optional fields (present in API but not used in table)
  Brand?: string;
  Group_ST?: string;
  Grade_Item_Group?: string;
  POS_Group?: string;
  Item_Name_Modified?: string;
  POS_Item_Name?: string;
}

/* =========================
   Service
========================= */

export const UnitEconomicsReportService = {
  getReports: (params?: {
    Fromdate?: string;
    Todate?: string;
    Product_Id?: number;
  }) =>
    axios.get<{
      success: boolean; data: {
        rows: UnitEconomicsReport[];
        lastStockValueDate?: {
          Last_Stock_Value_Date: string;
        };
      };
    }>(
      `${getBaseURL()}api/reports/externalAPI/unitEconomicsReport`,
      { params }
    ),
};
