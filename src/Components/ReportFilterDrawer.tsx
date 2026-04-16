import React from "react";
import {
    Box,
    Drawer,
    Typography,
    TextField,
    MenuItem,
    Button,
    IconButton,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormControl,
    FormLabel,
    Autocomplete
} from "@mui/material";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";

export interface DropdownOption {
    label: string;
    value: string | number;
}

interface ReportFilterDrawerProps {
    open: boolean;
    onToggle: () => void;
    onClose: () => void;

    fromDate: string;
    onFromDateChange: (value: string) => void;

    // OLD (keep for compatibility)
    dropdownLabel?: string;
    dropdownValue?: string | number;
    dropdownOptions?: DropdownOption[];
    onDropdownChange?: (value: string | number) => void;

    // NEW ✅
    filterLevels?: Record<number, any[]>;
    selectedFilters?: Record<string, any>;
    onFilterChange?: (column: string, value: any) => void;

    stockFilter?: "hasValues" | "zero" | "all";
    onStockFilterChange?: (val: "hasValues" | "zero" | "all") => void;

    onApply: () => void;

    toDate?: string;
    onToDateChange?: (value: string) => void;
}

const ReportFilterDrawer: React.FC<ReportFilterDrawerProps> = ({
    open,
    onToggle,
    onClose,
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,

    // OLD
    dropdownLabel,
    dropdownValue,
    dropdownOptions,
    onDropdownChange,

    // NEW ✅
    filterLevels,
    selectedFilters,
    onFilterChange,

    stockFilter,
    onStockFilterChange,
    onApply,
}) => {
    return (
        <>
            {/* 🔥 FIXED TOGGLE ARROW */}
            <IconButton
                onClick={onToggle}
                sx={{
                    position: "fixed",
                    right: 1,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 25,
                    height: 30,
                    bgcolor: "#1E3A8A",
                    color: "#fff",
                    zIndex: 1300,
                    borderRadius: "6px",
                    boxShadow: 2,
                    "&:hover": {
                        bgcolor: "#162E6E",
                    },
                }}
            >
                <KeyboardArrowLeftIcon
                    sx={{
                        fontSize: 22,
                        transition: "0.25s",
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                />
            </IconButton>

            {/* DRAWER */}
            <Drawer anchor="right" open={open} onClose={onClose}>
                <Box
                    width={320}
                    p={2}
                    sx={{ backgroundColor: "#F1F5F9", height: "100%" }}
                >
                    <Typography variant="h6" mb={2} fontWeight={700}>
                        Filters
                    </Typography>

                    <TextField
                        type="date"
                        label="From Date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={fromDate}
                        onChange={(e) => onFromDateChange(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    {toDate !== undefined && onToDateChange && (
                        <TextField
                            type="date"
                            label="To Date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => onToDateChange(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                    )}

                    {/* ✅ DYNAMIC FILTERS */}

                    {filterLevels && filterLevels[1] && (
                        <Box mb={2}>
                            <Typography fontWeight={600} mb={1}>
                                Filter Level-1
                            </Typography>

                            {filterLevels[1].map((filter: any) => (
                                <Autocomplete
                                    multiple
                                    options={filter.options || []}
                                    getOptionLabel={(option: any) => option.label}
                                    value={
                                        filter.options?.filter((opt: any) =>
                                            (selectedFilters?.[filter.columnName] || []).includes(opt.value)
                                        ) || []
                                    }
                                    onChange={(_, newValue) => {
                                        const values = newValue.map((opt: any) => opt.value);
                                        onFilterChange?.(filter.columnName, values);
                                    }}
                                    disableCloseOnSelect
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={filter.columnName}
                                            placeholder="Search..."
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                />
                            ))}
                        </Box>
                    )}

                    {/* ✅ FALLBACK (OLD SUPPORT) */}
                    {!filterLevels &&
                        dropdownOptions &&
                        dropdownOptions.length > 0 && (
                            <TextField
                                select
                                label={dropdownLabel}
                                fullWidth
                                value={dropdownValue ?? ""}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const option = dropdownOptions.find(
                                        (opt) => String(opt.value) === value
                                    );
                                    onDropdownChange?.(option ? option.value : "");
                                }}
                                sx={{ mb: 2 }}
                            >
                                <MenuItem value="">All</MenuItem>
                                {dropdownOptions.map((opt) => (
                                    <MenuItem key={opt.value} value={String(opt.value)}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                    {stockFilter && onStockFilterChange && (
                        <FormControl sx={{ mb: 2 }}>
                            <FormLabel sx={{ fontWeight: 600 }}>
                                Stock Filter
                            </FormLabel>

                            <RadioGroup
                                value={stockFilter}
                                onChange={(e) =>
                                    onStockFilterChange(e.target.value as any)
                                }
                            >
                                <FormControlLabel
                                    value="hasValues"
                                    control={<Radio size="small" />}
                                    label="Data only has values"
                                />
                                <FormControlLabel
                                    value="zero"
                                    control={<Radio size="small" />}
                                    label="Data with 0"
                                />
                                <FormControlLabel
                                    value="all"
                                    control={<Radio size="small" />}
                                    label="All"
                                />
                            </RadioGroup>
                        </FormControl>
                    )}

                    <Button
                        fullWidth
                        sx={{
                            backgroundColor: "#1E3A8A",
                            color: "#fff",
                            fontWeight: 600,
                            "&:hover": { backgroundColor: "#162E6E" },
                        }}
                        onClick={() => {
                            onApply();
                            onClose();
                        }}
                    >
                        Apply Filter
                    </Button>

                </Box>
            </Drawer>
        </>
    );
};

export default ReportFilterDrawer;
