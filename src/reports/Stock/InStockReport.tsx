import React, { useMemo, useState, useEffect } from "react";
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    TextField,
    Chip,
    InputAdornment,
    Button
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import dayjs from "dayjs";
import PageHeader from "../../Layout/PageHeader";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import CommonPagination from "../../Components/CommonPagination";

interface StockItem {
    sNo: number;
    brand: string;
    productName: string;
    openingStock: number;
    stockIn: number;
    stockInSplits?: {
        trip1: number;
        trip2: number;
        trip3: number;
    };
    stockOutSplits: {
        others1: number;
        others2: number;
        others3: number;
    };
    delivery: number;
    returns: number;
}

interface GroupHeader {
    label: string;
    bgColor: string;
    textColor: string;
    brandName: string;
}

const GROUP_HEADERS: Record<number, GroupHeader> = {
    1: { label: "WOW", bgColor: "#22c55e", textColor: "#fff", brandName: "WOW" }, // Green
    10: { label: "MOBITE", bgColor: "#ef4444", textColor: "#fff", brandName: "WOW" }, // Red
    27: { label: "BULK", bgColor: "#eab308", textColor: "#000", brandName: "WOW" }, // Yellow
    37: { label: "CHOCOLATES (CANDY)", bgColor: "#3b82f6", textColor: "#fff", brandName: "CANDY" }, // Blue
    70: { label: "CHIPS", bgColor: "#ef4444", textColor: "#fff", brandName: "CHIPS" }, // Red
    88: { label: "SNACKS", bgColor: "#10b981", textColor: "#fff", brandName: "SNACKS" }, // Green
    96: { label: "MERA RUSK", bgColor: "#14b8a6", textColor: "#fff", brandName: "RUSK" }, // Teal
    98: { label: "CHOLA COLOR (Pcs)", bgColor: "#1e3a8a", textColor: "#fff", brandName: "PLUNGE CLOUR" }, // Dark Blue
    109: { label: "WATER", bgColor: "#06b6d4", textColor: "#fff", brandName: "WATER" } // Cyan
};

const MOCK_STOCK_DATA: StockItem[] = [
    // WOW
    { sNo: 1, brand: "WOW", productName: "VEG BIRYANI", openingStock: 518, stockIn: 50, stockOutSplits: { others1: 300, others2: 19, others3: 27 }, delivery: 10, returns: 5 },
    { sNo: 2, brand: "WOW", productName: "PUFF (TOMATO)", openingStock: 175, stockIn: 30, stockOutSplits: { others1: 72, others2: 10, others3: 9 }, delivery: 5, returns: 2 },
    { sNo: 3, brand: "WOW", productName: "RINGS", openingStock: 92, stockIn: 15, stockOutSplits: { others1: 24, others2: 1, others3: 0 }, delivery: 2, returns: 1 },
    { sNo: 4, brand: "WOW", productName: "STICKS", openingStock: 58, stockIn: 10, stockOutSplits: { others1: 12, others2: 1, others3: 0 }, delivery: 3, returns: 0 },
    { sNo: 5, brand: "WOW", productName: "WAFERS", openingStock: 62, stockIn: 12, stockOutSplits: { others1: 12, others2: 1, others3: 0 }, delivery: 1, returns: 2 },
    { sNo: 6, brand: "WOW", productName: "MOONGDHALL", openingStock: 1148, stockIn: 200, stockOutSplits: { others1: 240, others2: 11, others3: 19 }, delivery: 40, returns: 15 },
    { sNo: 7, brand: "WOW", productName: "LOCAL CORN PUFF", openingStock: 42, stockIn: 50, stockOutSplits: { others1: 36, others2: 0, others3: 0 }, delivery: 2, returns: 1 },
    { sNo: 8, brand: "WOW", productName: "NOODLES", openingStock: 84, stockIn: 100, stockOutSplits: { others1: 48, others2: 1, others3: 1 }, delivery: 12, returns: 3 },
    { sNo: 9, brand: "WOW", productName: "POPCORN SALT", openingStock: 0, stockIn: 80, stockOutSplits: { others1: 40, others2: 10, others3: 5 }, delivery: 15, returns: 2 },

    // MOBITE
    { sNo: 10, brand: "WOW", productName: "MASALA", openingStock: 531, stockIn: 100, stockOutSplits: { others1: 30, others2: 0, others3: 18 }, delivery: 20, returns: 5 },
    { sNo: 11, brand: "WOW", productName: "CHEESE", openingStock: 340, stockIn: 60, stockOutSplits: { others1: 30, others2: 0, others3: 0 }, delivery: 15, returns: 1 },
    { sNo: 12, brand: "WOW", productName: "MINT", openingStock: 150, stockIn: 40, stockOutSplits: { others1: 20, others2: 0, others3: 0 }, delivery: 10, returns: 0 },
    { sNo: 13, brand: "WOW", productName: "MOBITE MILLET CHEESE", openingStock: 0, stockIn: 150, stockOutSplits: { others1: 50, others2: 25, others3: 15 }, delivery: 25, returns: 5 },
    { sNo: 14, brand: "WOW", productName: "MOBITE MILLET STICK", openingStock: 0, stockIn: 120, stockOutSplits: { others1: 40, others2: 20, others3: 10 }, delivery: 15, returns: 2 },
    { sNo: 15, brand: "WOW", productName: "SUPER CORN PUFF", openingStock: 1420, stockIn: 300, stockOutSplits: { others1: 30, others2: 210, others3: 0 }, delivery: 50, returns: 8 },
    { sNo: 16, brand: "WOW", productName: "SG SALT & PEPPER", openingStock: 58, stockIn: 24, stockOutSplits: { others1: 10, others2: 1, others3: 2 }, delivery: 4, returns: 1 },
    { sNo: 17, brand: "WOW", productName: "SG HOT & SPICY", openingStock: 18, stockIn: 12, stockOutSplits: { others1: 5, others2: 1, others3: 0 }, delivery: 2, returns: 0 },
    { sNo: 18, brand: "WOW", productName: "SOUR CREAM ONION", openingStock: 51, stockIn: 36, stockOutSplits: { others1: 15, others2: 2, others3: 3 }, delivery: 5, returns: 1 },
    { sNo: 19, brand: "WOW", productName: "SIZZLING JALAPENO", openingStock: 36, stockIn: 24, stockOutSplits: { others1: 10, others2: 2, others3: 1 }, delivery: 3, returns: 0 },
    { sNo: 20, brand: "WOW", productName: "HOT CHIN CHILLI GARLIC", openingStock: 54, stockIn: 30, stockOutSplits: { others1: 12, others2: 2, others3: 1 }, delivery: 4, returns: 1 },
    { sNo: 21, brand: "WOW", productName: "DAHIPURI", openingStock: 29, stockIn: 20, stockOutSplits: { others1: 8, others2: 2, others3: 0 }, delivery: 2, returns: 0 },
    { sNo: 22, brand: "WOW", productName: "WHEAT SALT & PEPPER", openingStock: 86, stockIn: 50, stockOutSplits: { others1: 18, others2: 2, others3: 2 }, delivery: 6, returns: 1 },
    { sNo: 23, brand: "WOW", productName: "PURI PURI", openingStock: 86, stockIn: 50, stockOutSplits: { others1: 20, others2: 2, others3: 2 }, delivery: 8, returns: 2 },
    { sNo: 24, brand: "WOW", productName: "CHEESE BALLS", openingStock: 51, stockIn: 36, stockOutSplits: { others1: 14, others2: 2, others3: 1 }, delivery: 5, returns: 0 },
    { sNo: 25, brand: "WOW", productName: "CHOCO BALLS", openingStock: 25, stockIn: 24, stockOutSplits: { others1: 10, others2: 2, others3: 1 }, delivery: 3, returns: 1 },
    { sNo: 26, brand: "WOW", productName: "POPCORN CARAMEL", openingStock: 0, stockIn: 100, stockOutSplits: { others1: 30, others2: 10, others3: 5 }, delivery: 12, returns: 3 },

    // BULK
    { sNo: 27, brand: "WOW", productName: "MOONGDHALL", openingStock: 0, stockIn: 500, stockOutSplits: { others1: 150, others2: 50, others3: 20 }, delivery: 100, returns: 10 },
    { sNo: 28, brand: "WOW", productName: "MASALA RICE CHIPS", openingStock: 0, stockIn: 300, stockOutSplits: { others1: 80, others2: 30, others3: 10 }, delivery: 50, returns: 5 },
    { sNo: 29, brand: "WOW", productName: "MASALA CORN SMALL", openingStock: 40, stockIn: 100, stockOutSplits: { others1: 4, others2: 10, others3: 5 }, delivery: 12, returns: 2 },
    { sNo: 30, brand: "WOW", productName: "MASALA CORN BIG", openingStock: 40, stockIn: 120, stockOutSplits: { others1: 4, others2: 12, others3: 2 }, delivery: 15, returns: 1 },
    { sNo: 31, brand: "WOW", productName: "CHEESE CORN POP", openingStock: 0, stockIn: 200, stockOutSplits: { others1: 60, others2: 20, others3: 10 }, delivery: 35, returns: 4 },
    { sNo: 32, brand: "WOW", productName: "POPCORN- SALT", openingStock: 0, stockIn: 150, stockOutSplits: { others1: 45, others2: 15, others3: 5 }, delivery: 25, returns: 2 },
    { sNo: 33, brand: "WOW", productName: "POPCORN- KARAM", openingStock: 0, stockIn: 150, stockOutSplits: { others1: 40, others2: 12, others3: 8 }, delivery: 20, returns: 3 },
    { sNo: 34, brand: "WOW", productName: "RINGS TOMATO", openingStock: 0, stockIn: 250, stockOutSplits: { others1: 70, others2: 30, others3: 10 }, delivery: 45, returns: 5 },
    { sNo: 35, brand: "WOW", productName: "SWEET CRISPY", openingStock: 0, stockIn: 180, stockOutSplits: { others1: 50, others2: 20, others3: 5 }, delivery: 30, returns: 1 },
    { sNo: 36, brand: "WOW", productName: "RINGS KARAM MASALA", openingStock: 0, stockIn: 250, stockOutSplits: { others1: 65, others2: 25, others3: 10 }, delivery: 40, returns: 6 },

    // CHOCOLATES (CANDY)
    { sNo: 37, brand: "CANDY", productName: "MILK JELLY", openingStock: 0, stockIn: 200, stockOutSplits: { others1: 60, others2: 30, others3: 10 }, delivery: 30, returns: 5 },
    { sNo: 38, brand: "CANDY", productName: "BROWNIE CAKE TUB", openingStock: 11, stockIn: 50, stockOutSplits: { others1: 2, others2: 5, others3: 2 }, delivery: 8, returns: 1 },
    { sNo: 39, brand: "CANDY", productName: "FRUIT JELLY R/S", openingStock: 13, stockIn: 80, stockOutSplits: { others1: 4, others2: 1, others3: 2 }, delivery: 10, returns: 0 },
    { sNo: 40, brand: "CANDY", productName: "ORANGE CANDY", openingStock: 12, stockIn: 100, stockOutSplits: { others1: 30, others2: 10, others3: 5 }, delivery: 15, returns: 2 },
    { sNo: 41, brand: "CANDY", productName: "GUAVA CANDY", openingStock: 12, stockIn: 100, stockOutSplits: { others1: 25, others2: 12, others3: 3 }, delivery: 12, returns: 1 },
    { sNo: 42, brand: "CANDY", productName: "CRUNCHY COCONUT", openingStock: 1, stockIn: 60, stockOutSplits: { others1: 15, others2: 5, others3: 2 }, delivery: 8, returns: 0 },
    { sNo: 43, brand: "CANDY", productName: "ELAICHI MIX JELLY", openingStock: 2, stockIn: 75, stockOutSplits: { others1: 20, others2: 10, others3: 5 }, delivery: 10, returns: 2 },
    { sNo: 44, brand: "CANDY", productName: "JELLY BON BON LOLLIPOP", openingStock: 1, stockIn: 120, stockOutSplits: { others1: 35, others2: 15, others3: 5 }, delivery: 18, returns: 1 },
    { sNo: 45, brand: "CANDY", productName: "MILK ECLAIRS", openingStock: 8, stockIn: 150, stockOutSplits: { others1: 40, others2: 20, others3: 10 }, delivery: 25, returns: 3 },
    { sNo: 46, brand: "CANDY", productName: "MINI SPO LOLLIPOP", openingStock: 10, stockIn: 90, stockOutSplits: { others1: 20, others2: 2, others3: 5 }, delivery: 12, returns: 1 },

    // DRINKS / CHIPS
    { sNo: 70, brand: "CHIPS", productName: "FLAMMING HOT", openingStock: 85, stockIn: 150, stockOutSplits: { others1: 10, others2: 3, others3: 4 }, delivery: 25, returns: 3 },
    { sNo: 71, brand: "CHIPS", productName: "MAGIC MASALA", openingStock: 102, stockIn: 120, stockOutSplits: { others1: 10, others2: 2, others3: 4 }, delivery: 20, returns: 2 },
    { sNo: 72, brand: "CHIPS", productName: "CREAM ONION", openingStock: 207, stockIn: 200, stockOutSplits: { others1: 10, others2: 6, others3: 4 }, delivery: 30, returns: 5 },
    { sNo: 73, brand: "CHIPS", productName: "CLASSIC SALT", openingStock: 58, stockIn: 100, stockOutSplits: { others1: 10, others2: 2, others3: 4 }, delivery: 15, returns: 1 },
    { sNo: 74, brand: "CHIPS", productName: "KURI KURI", openingStock: 98, stockIn: 120, stockOutSplits: { others1: 10, others2: 2, others3: 1 }, delivery: 18, returns: 2 },
    { sNo: 75, brand: "CHIPS", productName: "THIKKUM THIKKUM", openingStock: 34, stockIn: 80, stockOutSplits: { others1: 2, others2: 10, others3: 1 }, delivery: 12, returns: 0 },
    { sNo: 76, brand: "CHIPS", productName: "PATRA", openingStock: 52, stockIn: 60, stockOutSplits: { others1: 2, others2: 8, others3: 1 }, delivery: 8, returns: 1 },
    { sNo: 77, brand: "CHIPS", productName: "MASALA PEANUT", openingStock: 20, stockIn: 50, stockOutSplits: { others1: 2, others2: 5, others3: 0 }, delivery: 6, returns: 2 },
    { sNo: 78, brand: "CHIPS", productName: "PINZO CHIPS CUP", openingStock: 327, stockIn: 200, stockOutSplits: { others1: 10, others2: 8, others3: 11 }, delivery: 35, returns: 4 },
    { sNo: 79, brand: "CHIPS", productName: "PINZO WHEELS", openingStock: 2, stockIn: 80, stockOutSplits: { others1: 1, others2: 15, others3: 5 }, delivery: 10, returns: 1 },

    // SNACKS
    { sNo: 88, brand: "SNACKS", productName: "SOAN PAPDI 20PCS (M)", openingStock: 0, stockIn: 120, stockOutSplits: { others1: 30, others2: 10, others3: 5 }, delivery: 15, returns: 2 },
    { sNo: 89, brand: "SNACKS", productName: "KADALAI MITTAI 20P", openingStock: 8, stockIn: 90, stockOutSplits: { others1: 4, others2: 1, others3: 0 }, delivery: 12, returns: 1 },
    { sNo: 90, brand: "SNACKS", productName: "MIXTURE MITTAI", openingStock: 2, stockIn: 50, stockOutSplits: { others1: 12, others2: 1, others3: 2 }, delivery: 8, returns: 0 },
    { sNo: 91, brand: "SNACKS", productName: "PALKOVA", openingStock: 2, stockIn: 60, stockOutSplits: { others1: 15, others2: 1, others3: 1 }, delivery: 6, returns: 1 },

    // MERA RUSK
    { sNo: 96, brand: "RUSK", productName: "MERA ELAICHI RUSK 36PCS 1BOX", openingStock: 349, stockIn: 150, stockOutSplits: { others1: 36, others2: 6, others3: 5 }, delivery: 20, returns: 3 },
    { sNo: 97, brand: "RUSK", productName: "MERA MILK RUSK 48PCS 1BOX", openingStock: 95, stockIn: 120, stockOutSplits: { others1: 12, others2: 2, others3: 4 }, delivery: 15, returns: 2 },

    // CHOLA COLOR (Pcs)
    { sNo: 98, brand: "PLUNGE CLOUR", productName: "BOVONTO", openingStock: 1752, stockIn: 300, stockOutSplits: { others1: 8, others2: 20, others3: 10 }, delivery: 50, returns: 8 },
    { sNo: 99, brand: "PLUNGE CLOUR", productName: "7 UP", openingStock: 1547, stockIn: 250, stockOutSplits: { others1: 6, others2: 18, others3: 5 }, delivery: 40, returns: 6 },
    { sNo: 100, brand: "PLUNGE CLOUR", productName: "FANTASY", openingStock: 1727, stockIn: 300, stockOutSplits: { others1: 89, others2: 48, others3: 12 }, delivery: 60, returns: 10 },
    { sNo: 101, brand: "PLUNGE CLOUR", productName: "ORANGE", openingStock: 1210, stockIn: 200, stockOutSplits: { others1: 6, others2: 20, others3: 5 }, delivery: 35, returns: 4 },
    { sNo: 102, brand: "PLUNGE CLOUR", productName: "MANGO", openingStock: 2064, stockIn: 400, stockOutSplits: { others1: 6, others2: 110, others3: 20 }, delivery: 75, returns: 12 },
    { sNo: 103, brand: "PLUNGE CLOUR", productName: "LICHI", openingStock: 858, stockIn: 150, stockOutSplits: { others1: 19, others2: 18, others3: 5 }, delivery: 28, returns: 3 },

    // WATER
    { sNo: 109, brand: "WATER", productName: "WATER 1 LTR", openingStock: 350, stockIn: 150, stockOutSplits: { others1: 6, others2: 4, others3: 2 }, delivery: 15, returns: 1 },
    { sNo: 110, brand: "WATER", productName: "WATER 500 ML", openingStock: 44, stockIn: 120, stockOutSplits: { others1: 7, others2: 5, others3: 3 }, delivery: 12, returns: 2 },
    { sNo: 111, brand: "WATER", productName: "WATER 300 ML", openingStock: 63, stockIn: 100, stockOutSplits: { others1: 1, others2: 1, others3: 1 }, delivery: 10, returns: 0 },
    { sNo: 112, brand: "WATER", productName: "2 IN 1", openingStock: 3, stockIn: 40, stockOutSplits: { others1: 2, others2: 1, others3: 1 }, delivery: 5, returns: 1 }
];

const GODOWNS = [
    "Kappalur Godown",
    "Live Sales Godown",
    "Purchase Warehouse",
    "MainLocation",
    "Office Godown",
    "P&T Nagar Godown"
];

const GODOWN_MULTIPLIERS: Record<string, number> = {
    "Kappalur Godown": 1.2,
    "Live Sales Godown": 0.8,
    "Purchase Warehouse": 2.5,
    "MainLocation": 1.5,
    "Office Godown": 0.2,
    "P&T Nagar Godown": 0.6
};

const getStockDataForGodown = (godownName: string): StockItem[] => {
    const mult = GODOWN_MULTIPLIERS[godownName] || 1;
    return MOCK_STOCK_DATA.map(item => {
        const others1 = Math.round(item.stockOutSplits.others1 * mult);
        const others2 = Math.round(item.stockOutSplits.others2 * mult);
        const others3 = Math.round(item.stockOutSplits.others3 * mult);
        const scaledStockIn = Math.round(item.stockIn * mult);
        
        // Dynamic stockIn splits (Trips)
        const trip1 = Math.round(scaledStockIn * 0.5);
        const trip2 = Math.round(scaledStockIn * 0.3);
        const trip3 = Math.max(0, scaledStockIn - trip1 - trip2);

        return {
            ...item,
            openingStock: Math.round(item.openingStock * mult),
            stockIn: scaledStockIn,
            stockInSplits: { trip1, trip2, trip3 },
            stockOutSplits: { others1, others2, others3 },
            delivery: Math.round(item.delivery * mult),
            returns: Math.round(item.returns * mult)
        };
    });
};

const InStockReport: React.FC = () => {
    const [selectedGodown, setSelectedGodown] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string>("All");

    // Pagination states
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);

    // Dynamic header split-up modes
    const [inwardMode, setInwardMode] = useState(false);
    const [outwardMode, setOutwardMode] = useState(false);

    // Modal details for Stock Out splits
    const [modalOpen, setModalOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<StockItem | null>(null);

    // Reset page to 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [searchText, selectedBrand, rowsPerPage, selectedGodown]);

    // Reset modes when selected godown changes
    useEffect(() => {
        setInwardMode(false);
        setOutwardMode(false);
    }, [selectedGodown]);

    // List of unique brands for filtering
    const brands = useMemo(() => {
        const set = new Set<string>();
        MOCK_STOCK_DATA.forEach(x => set.add(x.brand));
        return ["All", ...Array.from(set).sort()];
    }, []);

    // Load scaled data for the selected godown
    const currentGodownData = useMemo(() => {
        if (!selectedGodown) return [];
        return getStockDataForGodown(selectedGodown);
    }, [selectedGodown]);

    // Filtered data based on search and brand filter
    const filteredData = useMemo(() => {
        return currentGodownData.filter((item) => {
            const matchesSearch = item.productName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.brand.toLowerCase().includes(searchText.toLowerCase());
            const matchesBrand = selectedBrand === "All" || item.brand === selectedBrand;
            return matchesSearch && matchesBrand;
        });
    }, [currentGodownData, searchText, selectedBrand]);

    // Slice data for pagination
    const paginatedData = useMemo(() => {
        return filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    // Helpers
    const getStockOutTotal = (item: StockItem) => {
        return item.stockOutSplits.others1 + item.stockOutSplits.others2 + item.stockOutSplits.others3;
    };

    const getClosingStock = (item: StockItem) => {
        const out = getStockOutTotal(item);
        return item.openingStock + item.stockIn - out - item.delivery + item.returns;
    };

    const getHeaderForSNo = (sNo: number): GroupHeader | null => {
        const headerSNos = Object.keys(GROUP_HEADERS)
            .map(Number)
            .sort((a, b) => b - a);
        const foundSNo = headerSNos.find(hSNo => sNo >= hSNo);
        return foundSNo !== undefined ? GROUP_HEADERS[foundSNo] : null;
    };

    const handleStockOutClick = (item: StockItem) => {
        setActiveItem(item);
        setModalOpen(true);
    };

    // Calculate aggregated overall summary of godowns
    const godownSummaryData = useMemo(() => {
        return GODOWNS.map((name, idx) => {
            const data = getStockDataForGodown(name);
            let totalOpening = 0;
            let totalStockIn = 0;
            let totalStockOut = 0;
            let totalDelivery = 0;
            let totalReturns = 0;

            data.forEach(item => {
                totalOpening += item.openingStock;
                totalStockIn += item.stockIn;
                totalStockOut += item.stockOutSplits.others1 + item.stockOutSplits.others2 + item.stockOutSplits.others3;
                totalDelivery += item.delivery;
                totalReturns += item.returns;
            });

            const totalClosing = totalOpening + totalStockIn - totalStockOut - totalDelivery + totalReturns;

            return {
                sNo: idx + 1,
                name,
                openingStock: totalOpening,
                stockIn: totalStockIn,
                stockOut: totalStockOut,
                delivery: totalDelivery,
                returns: totalReturns,
                closingStock: totalClosing
            };
        });
    }, []);

    // Calculate grand totals across all godowns
    const grandTotals = useMemo(() => {
        let opening = 0;
        let stockIn = 0;
        let stockOut = 0;
        let delivery = 0;
        let returns = 0;
        let closing = 0;

        godownSummaryData.forEach(g => {
            opening += g.openingStock;
            stockIn += g.stockIn;
            stockOut += g.stockOut;
            delivery += g.delivery;
            returns += g.returns;
            closing += g.closingStock;
        });

        return { opening, stockIn, stockOut, delivery, returns, closing };
    }, [godownSummaryData]);

    // Calculate totals for the selected godown's filtered data
    const detailedTotals = useMemo(() => {
        let opening = 0;
        let stockIn = 0;
        let returns = 0;
        let trip1 = 0;
        let trip2 = 0;
        let trip3 = 0;
        let others1 = 0;
        let others2 = 0;
        let others3 = 0;
        let delivery = 0;
        let stockOutTotal = 0;
        let closing = 0;

        filteredData.forEach(item => {
            opening += item.openingStock;
            stockIn += item.stockIn;
            returns += item.returns;
            if (item.stockInSplits) {
                trip1 += item.stockInSplits.trip1;
                trip2 += item.stockInSplits.trip2;
                trip3 += item.stockInSplits.trip3;
            }
            others1 += item.stockOutSplits.others1;
            others2 += item.stockOutSplits.others2;
            others3 += item.stockOutSplits.others3;
            delivery += item.delivery;
            stockOutTotal += (item.stockOutSplits.others1 + item.stockOutSplits.others2 + item.stockOutSplits.others3);
            closing += (item.openingStock + item.stockIn - (item.stockOutSplits.others1 + item.stockOutSplits.others2 + item.stockOutSplits.others3) - item.delivery + item.returns);
        });

        return {
            opening,
            stockIn,
            returns,
            trip1,
            trip2,
            trip3,
            others1,
            others2,
            others3,
            delivery,
            stockOutTotal,
            closing,
            totalInward: stockIn + returns,
            totalOutward: stockOutTotal + delivery
        };
    }, [filteredData]);

    // Excel Export
    const handleExportExcel = () => {
        try {
            const excelData: any[][] = [];
            if (selectedGodown) {
                excelData.push([`STOCK REPORT - ${selectedGodown.toUpperCase()}`]);
                excelData.push([]);
                if (inwardMode) {
                    excelData.push(["S.No", "Brand", "Product Name", "Opening Stock", "Trip 1", "Trip 2", "Trip 3", "Return", "Total Inward"]);
                    filteredData.forEach((item) => {
                        excelData.push([
                            item.sNo,
                            item.brand,
                            item.productName,
                            item.openingStock,
                            item.stockInSplits?.trip1 || 0,
                            item.stockInSplits?.trip2 || 0,
                            item.stockInSplits?.trip3 || 0,
                            item.returns,
                            item.stockIn + item.returns
                        ]);
                    });
                } else if (outwardMode) {
                    excelData.push(["S.No", "Brand", "Product Name", "Opening Stock", "Others 1", "Others 2", "Others 3", "Delivery", "Total Outward"]);
                    filteredData.forEach((item) => {
                        excelData.push([
                            item.sNo,
                            item.brand,
                            item.productName,
                            item.openingStock,
                            item.stockOutSplits.others1,
                            item.stockOutSplits.others2,
                            item.stockOutSplits.others3,
                            item.delivery,
                            getStockOutTotal(item) + item.delivery
                        ]);
                    });
                } else {
                    excelData.push(["S.No", "Brand", "Product Name", "Opening Stock", "Stock In", "Stock Outwards", "Closing Stock"]);
                    filteredData.forEach((item) => {
                        excelData.push([
                            item.sNo,
                            item.brand,
                            item.productName,
                            item.openingStock,
                            item.stockIn,
                            getStockOutTotal(item),
                            getClosingStock(item)
                        ]);
                    });
                }
            } else {
                excelData.push([`GODOWNS OVERALL SUMMARY`]);
                excelData.push([]);
                excelData.push(["S.No", "Godown Name", "Opening Stock", "Stock In", "Stock Out", "Delivery", "Return", "Closing Stock"]);

                godownSummaryData.forEach((item) => {
                    excelData.push([
                        item.sNo,
                        item.name,
                        item.openingStock,
                        item.stockIn,
                        item.stockOut,
                        item.delivery,
                        item.returns,
                        item.closingStock
                    ]);
                });
            }

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stock Report");
            XLSX.writeFile(wb, `Stock_Report_${selectedGodown ? selectedGodown.replace(/\s+/g, '_') : 'Overall'}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
            toast.success("Excel Exported Successfully ✅");
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel ❌");
        }
    };

    // PDF Export
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF("portrait", "mm", "a4");
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");

            const title = selectedGodown ? `STOCK REPORT - ${selectedGodown.toUpperCase()}` : "GODOWNS OVERALL SUMMARY";
            doc.text(title, 105, 12, { align: "center" });

            const body: any[][] = [];
            let headers: string[][] = [];

            if (selectedGodown) {
                if (inwardMode) {
                    headers = [["S.No", "Brand", "Product Name", "Opening", "Trip 1", "Trip 2", "Trip 3", "Return", "Total Inward"]];
                    filteredData.forEach((item) => {
                        body.push([
                            item.sNo,
                            item.brand,
                            item.productName,
                            item.openingStock,
                            item.stockInSplits?.trip1 || 0,
                            item.stockInSplits?.trip2 || 0,
                            item.stockInSplits?.trip3 || 0,
                            item.returns,
                            item.stockIn + item.returns
                        ]);
                    });
                } else if (outwardMode) {
                    headers = [["S.No", "Brand", "Product Name", "Opening", "Others 1", "Others 2", "Others 3", "Delivery", "Total Outward"]];
                    filteredData.forEach((item) => {
                        body.push([
                            item.sNo,
                            item.brand,
                            item.productName,
                            item.openingStock,
                            item.stockOutSplits.others1,
                            item.stockOutSplits.others2,
                            item.stockOutSplits.others3,
                            item.delivery,
                            getStockOutTotal(item) + item.delivery
                        ]);
                    });
                } else {
                    headers = [["S.No", "Brand", "Product Name", "Opening", "Stock In", "Stock Out", "Closing"]];
                    filteredData.forEach((item) => {
                        body.push([
                            item.sNo,
                            item.brand,
                            item.productName,
                            item.openingStock,
                            item.stockIn,
                            getStockOutTotal(item),
                            getClosingStock(item)
                        ]);
                    });
                }
            } else {
                headers = [["S.No", "Godown Name", "Opening", "In", "Out", "Del", "Ret", "Closing"]];
                godownSummaryData.forEach((item) => {
                    body.push([
                        item.sNo,
                        item.name,
                        item.openingStock,
                        item.stockIn,
                        item.stockOut,
                        item.delivery,
                        item.returns,
                        item.closingStock
                    ]);
                });
            }

            autoTable(doc, {
                startY: 20,
                head: headers,
                body: body,
                styles: { fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
                theme: "grid"
            });

            const filename = `Stock_Report_${selectedGodown ? selectedGodown.replace(/\s+/g, '_') : 'Overall'}_${dayjs().format("YYYYMMDD_HHmmss")}.pdf`;
            doc.save(filename);
            toast.success("PDF Exported Successfully ✅");
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF ❌");
        }
    };

    return (
        <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "#f8fafc", p: 2, boxSizing: "border-box" }}>
            <PageHeader
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                showPages={true}
            />

            {!selectedGodown ? (
                <>
                    {/* Summary Cards */}
                    <Box sx={{ display: "flex", gap: 3, mb: 3, mt: 2, flexWrap: "wrap" }}>
                        <Paper elevation={1} sx={{ flex: 1, minWidth: 200, p: 2.5, borderRadius: 2, borderLeft: "4px solid #1E3A8A", bgcolor: "#fff" }}>
                            <Typography variant="caption" fontWeight={600} color="textSecondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>Total Physical Stock</Typography>
                            <Typography variant="h4" fontWeight={700} sx={{ mt: 1, color: "#1e293b" }}>{grandTotals.closing.toLocaleString()}</Typography>
                        </Paper>
                        <Paper elevation={1} sx={{ flex: 1, minWidth: 200, p: 2.5, borderRadius: 2, borderLeft: "4px solid #10b981", bgcolor: "#fff" }}>
                            <Typography variant="caption" fontWeight={600} color="textSecondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>Total Inward (Stock In)</Typography>
                            <Typography variant="h4" fontWeight={700} sx={{ mt: 1, color: "#1e293b" }}>{grandTotals.stockIn.toLocaleString()}</Typography>
                        </Paper>
                        <Paper elevation={1} sx={{ flex: 1, minWidth: 200, p: 2.5, borderRadius: 2, borderLeft: "4px solid #ef4444", bgcolor: "#fff" }}>
                            <Typography variant="caption" fontWeight={600} color="textSecondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>Total Outward (Out + Del)</Typography>
                            <Typography variant="h4" fontWeight={700} sx={{ mt: 1, color: "#1e293b" }}>{(grandTotals.stockOut + grandTotals.delivery).toLocaleString()}</Typography>
                        </Paper>
                    </Box>

                    {/* Overall Summary Table */}
                    <TableContainer
                        component={Paper}
                        elevation={2}
                        sx={{
                            borderRadius: 2,
                            border: "1px solid #cbd5e1",
                            maxHeight: "calc(100vh - 180px)",
                            overflowY: "auto",
                            overflowX: "hidden"
                        }}
                    >
                        <Table
                            size="small"
                            stickyHeader
                            sx={{
                                tableLayout: "fixed",
                                width: "100%",
                                "& .MuiTableCell-root": {
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                    lineHeight: 1.2,
                                    fontSize: "0.85rem",
                                    px: 1.5,
                                    py: 1.5
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center" sx={{ width: "8%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>S.NO</TableCell>
                                    <TableCell sx={{ width: "32%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>GODOWN NAME</TableCell>
                                    <TableCell align="right" sx={{ width: "12%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>OPENING STOCK</TableCell>
                                    <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>STOCK IN</TableCell>
                                    <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>STOCK OUT</TableCell>
                                    <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>DELIVERY</TableCell>
                                    <TableCell align="right" sx={{ width: "8%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>RETURN</TableCell>
                                    <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5 }}>CLOSING STOCK</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {godownSummaryData.map((item) => (
                                    <TableRow key={item.name} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                        <TableCell align="center" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, color: "#475569" }}>
                                            {item.sNo}
                                        </TableCell>
                                        <TableCell
                                            onClick={() => setSelectedGodown(item.name)}
                                            sx={{
                                                borderRight: "1px solid #e2e8f0",
                                                fontWeight: 700,
                                                color: "#2563eb",
                                                cursor: "pointer",
                                                textDecoration: "underline",
                                                "&:hover": { color: "#1d4ed8" }
                                            }}
                                        >
                                            {item.name}
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                            {item.openingStock.toLocaleString()}
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#2563eb" }}>
                                            {item.stockIn.toLocaleString()}
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#ef4444" }}>
                                            {item.stockOut.toLocaleString()}
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                            {item.delivery.toLocaleString()}
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                            {item.returns.toLocaleString()}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, pr: 2, backgroundColor: "#dcfce7", color: "#15803d" }}>
                                            {item.closingStock.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ backgroundColor: "#f1f5f9" }}>
                                    <TableCell colSpan={2} align="center" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800 }}>
                                        GRAND TOTAL
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                        {grandTotals.opening.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                        {grandTotals.stockIn.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                        {grandTotals.stockOut.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                        {grandTotals.delivery.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                        {grandTotals.returns.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, pr: 2, color: "#15803d" }}>
                                        {grandTotals.closing.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            ) : (
                <>
                    {/* Navigation Back Button and Subtitle */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, mt: 2 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setSelectedGodown(null)}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                color: "#1E3A8A",
                                borderColor: "#cbd5e1",
                                "&:hover": { bgcolor: "#f1f5f9", borderColor: "#1e40af" }
                            }}
                        >
                            ← Back to Godown Summary
                        </Button>
                        <Typography variant="subtitle1" fontWeight={700} color="#475569">
                            / {selectedGodown}
                        </Typography>
                    </Box>

                    {/* Filters and Brand Chips */}
                    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 2, mb: 2 }}>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {brands.map((b) => (
                                <Chip
                                    key={b}
                                    label={b}
                                    clickable
                                    color={selectedBrand === b ? "primary" : "default"}
                                    onClick={() => setSelectedBrand(b)}
                                    sx={{
                                        fontWeight: 600,
                                        px: 1,
                                        bgcolor: selectedBrand === b ? "#1E3A8A" : "#fff",
                                        border: "1px solid #e2e8f0",
                                        "&:hover": { bgcolor: selectedBrand === b ? "#1e40af" : "#f1f5f9" }
                                    }}
                                />
                            ))}
                        </Box>
                        <TextField
                            size="small"
                            placeholder="Search product..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            sx={{ width: 250, bgcolor: "#fff", borderRadius: 1 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Box>

                    {/* Detailed Stock Table Container */}
                    <TableContainer
                        component={Paper}
                        elevation={2}
                        sx={{
                            borderRadius: 2,
                            border: "1px solid #cbd5e1",
                            maxHeight: "calc(100vh - 230px)",
                            overflowY: "auto",
                            overflowX: "hidden"
                        }}
                    >
                        <Table
                            size="small"
                            stickyHeader
                            sx={{
                                tableLayout: "fixed",
                                width: "100%",
                                "& .MuiTableCell-root": {
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                    lineHeight: 1.2,
                                    fontSize: "0.8rem",
                                    px: 1
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center" sx={{ width: (inwardMode || outwardMode) ? "5%" : "6%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>S.NO</TableCell>
                                    <TableCell sx={{ width: (inwardMode || outwardMode) ? "8%" : "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>NAME</TableCell>
                                    <TableCell sx={{ width: (inwardMode || outwardMode) ? "25%" : "32%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>PRODUCT NAME</TableCell>
                                    <TableCell align="right" sx={{ width: (inwardMode || outwardMode) ? "10%" : "13%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>OPENING STOCK</TableCell>
                                    
                                    {/* Stock In Header - Clicking toggles inwardMode. Shown only in Normal Mode */}
                                    {!inwardMode && !outwardMode && (
                                        <TableCell
                                            align="right"
                                            onClick={() => {
                                                setInwardMode(true);
                                            }}
                                            sx={{
                                                width: "13%",
                                                backgroundColor: "#1E3A8A",
                                                color: "#fff",
                                                fontWeight: 600,
                                                py: 1.5,
                                                borderRight: "1px solid #cbd5e1",
                                                cursor: "pointer",
                                                userSelect: "none",
                                                textDecoration: "underline",
                                                transition: "background-color 0.2s",
                                                "&:hover": {
                                                    backgroundColor: "#1e40af"
                                                }
                                            }}
                                        >
                                            STOCK IN ▼
                                        </TableCell>
                                    )}

                                    {/* Show RETURN, TRIP 1, TRIP 2, TRIP 3, and TOTAL INWARD columns when inwardMode is active */}
                                    {inwardMode && (
                                        <>
                                            <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>TRIP 1</TableCell>
                                            <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>TRIP 2</TableCell>
                                            <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>TRIP 3</TableCell>
                                            <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>RETURN</TableCell>
                                            <TableCell
                                                align="right"
                                                onClick={() => setInwardMode(false)}
                                                sx={{
                                                    width: "12%",
                                                    backgroundColor: "#111827",
                                                    color: "#fff",
                                                    fontWeight: 700,
                                                    py: 1.5,
                                                    cursor: "pointer",
                                                    userSelect: "none",
                                                    textDecoration: "underline",
                                                    "&:hover": {
                                                        backgroundColor: "#1f2937"
                                                    }
                                                }}
                                            >
                                                TOTAL INWARD ▲
                                            </TableCell>
                                        </>
                                    )}

                                    {/* Stock Outwards Header - Clicking toggles outwardMode. Shown only in Normal Mode */}
                                    {!inwardMode && !outwardMode && (
                                        <TableCell
                                            align="right"
                                            onClick={() => {
                                                setOutwardMode(true);
                                            }}
                                            sx={{
                                                width: "13%",
                                                backgroundColor: "#1E3A8A",
                                                color: "#fff",
                                                fontWeight: 600,
                                                py: 1.5,
                                                borderRight: "1px solid #cbd5e1",
                                                cursor: "pointer",
                                                userSelect: "none",
                                                textDecoration: "underline",
                                                transition: "background-color 0.2s",
                                                "&:hover": {
                                                    backgroundColor: "#1e40af"
                                                }
                                            }}
                                        >
                                            STOCK OUTWARDS ▼
                                        </TableCell>
                                    )}

                                    {/* Show splits for Stock Outwards when outwardMode is active */}
                                    {outwardMode && (
                                        <>
                                            <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>OTHERS 1</TableCell>
                                            <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>OTHERS 2</TableCell>
                                            <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>OTHERS 3</TableCell>
                                            <TableCell align="right" sx={{ width: "10%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5, borderRight: "1px solid #cbd5e1" }}>DELIVERY</TableCell>
                                            <TableCell
                                                align="right"
                                                onClick={() => setOutwardMode(false)}
                                                sx={{
                                                    width: "12%",
                                                    backgroundColor: "#111827",
                                                    color: "#fff",
                                                    fontWeight: 700,
                                                    py: 1.5,
                                                    cursor: "pointer",
                                                    userSelect: "none",
                                                    textDecoration: "underline",
                                                    "&:hover": {
                                                        backgroundColor: "#1f2937"
                                                    }
                                                }}
                                            >
                                                TOTAL OUTWARD ▲
                                            </TableCell>
                                        </>
                                    )}

                                    {/* Closing Stock is shown in Normal Mode */}
                                    {!inwardMode && !outwardMode && (
                                        <TableCell align="right" sx={{ width: "13%", backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 600, py: 1.5 }}>
                                            CLOSING STOCK
                                        </TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={(inwardMode || outwardMode) ? 9 : 7} align="center" sx={{ py: 6, color: "#94a3b8" }}>
                                            No stock items match your search/filter filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((item, idx) => {
                                        const groupHeader = getHeaderForSNo(item.sNo);
                                        const showHeader = idx === 0 || !!GROUP_HEADERS[item.sNo];
                                        const stockOut = getStockOutTotal(item);
                                        const closing = getClosingStock(item);

                                        return (
                                            <React.Fragment key={item.sNo}>
                                                {/* Optional Category Group Banner */}
                                                {showHeader && groupHeader && (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={(inwardMode || outwardMode) ? 9 : 7}
                                                            sx={{
                                                                backgroundColor: groupHeader.bgColor,
                                                                color: groupHeader.textColor,
                                                                fontWeight: 800,
                                                                py: 1,
                                                                px: 2,
                                                                fontSize: "0.9rem",
                                                                letterSpacing: 1,
                                                                textAlign: "center"
                                                            }}
                                                        >
                                                            {groupHeader.label}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {/* Data Row */}
                                                <TableRow hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                                    <TableCell align="center" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, color: "#475569" }}>
                                                        {item.sNo}
                                                    </TableCell>
                                                    <TableCell sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, color: "#475569" }}>
                                                        {item.brand}
                                                    </TableCell>
                                                    <TableCell sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 700, color: "#1e293b", wordBreak: "break-word", whiteSpace: "normal" }}>
                                                        {item.productName}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                                        {item.openingStock || "-"}
                                                    </TableCell>

                                                    {/* Inward Mode or Normal Mode: Render Stock In */}
                                                    {!inwardMode && !outwardMode && (
                                                        <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: item.stockIn > 0 ? "#2563eb" : "#475569" }}>
                                                            {item.stockIn || "-"}
                                                        </TableCell>
                                                    )}

                                                    {/* Inward Mode: Render TRIP 1, TRIP 2, TRIP 3, RETURN, and TOTAL INWARD */}
                                                    {inwardMode && (
                                                        <>
                                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                                                {item.stockInSplits?.trip1 || "-"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                                                {item.stockInSplits?.trip2 || "-"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                                                {item.stockInSplits?.trip3 || "-"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: item.returns > 0 ? "#10b981" : "#475569" }}>
                                                                {item.returns || "-"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700, pr: 2, backgroundColor: "#eff6ff", color: "#1e40af" }}>
                                                                {(item.stockIn + item.returns) || "-"}
                                                            </TableCell>
                                                        </>
                                                    )}

                                                    {/* Normal Mode: Render STOCK OUTWARDS */}
                                                    {!inwardMode && !outwardMode && (
                                                        <TableCell
                                                            align="right"
                                                            onClick={() => stockOut > 0 && handleStockOutClick(item)}
                                                            sx={{
                                                                borderRight: "1px solid #e2e8f0",
                                                                fontWeight: 700,
                                                                pr: 2,
                                                                color: stockOut > 0 ? "#ef4444" : "#475569",
                                                                cursor: stockOut > 0 ? "pointer" : "default",
                                                                textDecoration: stockOut > 0 ? "underline" : "none",
                                                                "&:hover": {
                                                                    color: stockOut > 0 ? "#dc2626" : "#475569"
                                                                }
                                                            }}
                                                        >
                                                            {stockOut || "-"}
                                                        </TableCell>
                                                    )}

                                                    {/* Outward Mode: Render OTHERS 1, OTHERS 2, OTHERS 3, DELIVERY, and TOTAL OUTWARD */}
                                                    {outwardMode && (
                                                        <>
                                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                                                {item.stockOutSplits.others1 || "-"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                                                {item.stockOutSplits.others2 || "-"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: "#475569" }}>
                                                                {item.stockOutSplits.others3 || "-"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 600, pr: 2, color: item.delivery > 0 ? "#ef4444" : "#475569" }}>
                                                                {item.delivery || "-"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700, pr: 2, backgroundColor: "#fef2f2", color: "#b91c1c" }}>
                                                                {(stockOut + item.delivery) || "-"}
                                                            </TableCell>
                                                        </>
                                                    )}

                                                    {/* Normal Mode: Render CLOSING STOCK */}
                                                    {!inwardMode && !outwardMode && (
                                                        <TableCell
                                                            align="right"
                                                            sx={{
                                                                fontWeight: 700,
                                                                pr: 2,
                                                                backgroundColor: closing > 0 ? "#dcfce7" : "transparent",
                                                                color: closing > 0 ? "#15803d" : "#475569"
                                                            }}
                                                        >
                                                            {closing}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                                {/* Grand Total Row */}
                                {paginatedData.length > 0 && (
                                    <TableRow sx={{ backgroundColor: "#f1f5f9" }}>
                                        <TableCell colSpan={3} align="center" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800 }}>
                                            GRAND TOTAL
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                            {detailedTotals.opening.toLocaleString()}
                                        </TableCell>

                                        {/* Normal Mode: Stock In */}
                                        {!inwardMode && !outwardMode && (
                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                {detailedTotals.stockIn.toLocaleString()}
                                            </TableCell>
                                        )}

                                        {/* Inward Mode: Trip 1, Trip 2, Trip 3, Returns, Total Inward */}
                                        {inwardMode && (
                                            <>
                                                <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                    {detailedTotals.trip1.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                    {detailedTotals.trip2.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                    {detailedTotals.trip3.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                    {detailedTotals.returns.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, pr: 2, color: "#1e40af" }}>
                                                    {detailedTotals.totalInward.toLocaleString()}
                                                </TableCell>
                                            </>
                                        )}

                                        {/* Normal Mode: Stock Outwards */}
                                        {!inwardMode && !outwardMode && (
                                            <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                {detailedTotals.stockOutTotal.toLocaleString()}
                                            </TableCell>
                                        )}

                                        {/* Outward Mode: Others 1, 2, 3, Delivery, and Total Outward */}
                                        {outwardMode && (
                                            <>
                                                <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                    {detailedTotals.others1.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                    {detailedTotals.others2.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                    {detailedTotals.others3.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: "1px solid #e2e8f0", fontWeight: 800, pr: 2 }}>
                                                    {detailedTotals.delivery.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, pr: 2, color: "#b91c1c" }}>
                                                    {detailedTotals.totalOutward.toLocaleString()}
                                                </TableCell>
                                            </>
                                        )}

                                        {/* Normal Mode: Closing */}
                                        {!inwardMode && !outwardMode && (
                                            <TableCell align="right" sx={{ fontWeight: 800, pr: 2, color: "#15803d" }}>
                                                {detailedTotals.closing.toLocaleString()}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <CommonPagination
                        totalRows={filteredData.length}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={setRowsPerPage}
                    />
                </>
            )}

            {/* Split Details Dialog */}
            <Dialog
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3 }
                }}
            >
                <DialogTitle sx={{ backgroundColor: "#1E3A8A", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", py: 2 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: "1rem" }}>
                        Stock Out Splits: {activeItem?.productName}
                    </Typography>
                    <IconButton
                        onClick={() => setModalOpen(false)}
                        sx={{
                            color: "#fff",
                            p: 0.5,
                            "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" }
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 2, bgcolor: "#f8fafc" }}>
                    {activeItem && (
                        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 1.5, border: "1px solid #cbd5e1" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9" }}>Stage</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", pr: 2 }}>Quantity</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow hover>
                                        <TableCell sx={{ fontWeight: 600 }}>Others 1</TableCell>
                                        <TableCell align="right" sx={{ pr: 2, fontWeight: 700 }}>
                                            {activeItem.stockOutSplits.others1 || "-"}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                        <TableCell sx={{ fontWeight: 600 }}>Others 2</TableCell>
                                        <TableCell align="right" sx={{ pr: 2, fontWeight: 700 }}>
                                            {activeItem.stockOutSplits.others2 || "-"}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                        <TableCell sx={{ fontWeight: 600 }}>Others 3</TableCell>
                                        <TableCell align="right" sx={{ pr: 2, fontWeight: 700 }}>
                                            {activeItem.stockOutSplits.others3 || "-"}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow sx={{ backgroundColor: "#f1f5f9" }}>
                                        <TableCell sx={{ fontWeight: 800 }}>Total Stock Out</TableCell>
                                        <TableCell align="right" sx={{ pr: 2, fontWeight: 800, color: "#ef4444" }}>
                                            {getStockOutTotal(activeItem)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default InStockReport;
