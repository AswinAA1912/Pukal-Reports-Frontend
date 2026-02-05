import React from "react";
import {
    Box,
    Drawer,
    Typography,
    TextField,
    MenuItem,
    Button,
    Fab,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";

export interface DropdownOption {
    label: string;
    value: string | number;
}

interface ReportFilterDrawerProps {
    open: boolean;
    onOpen: () => void;      // ✅ add this
    onClose: () => void;

    fromDate: string;
    toDate: string;
    onFromDateChange: (value: string) => void;
    onToDateChange: (value: string) => void;

    dropdownLabel: string;
    dropdownValue: string | number;
    dropdownOptions: DropdownOption[];
    onDropdownChange: (value: string | number) => void;

    onApply: () => void;
}

const ReportFilterDrawer: React.FC<ReportFilterDrawerProps> = ({
    open,
    onOpen,    // ✅ receive callback
    onClose,
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    dropdownLabel,
    dropdownValue,
    dropdownOptions,
    onDropdownChange,
    onApply,
}) => {
    return (
        <>
            {/* Floating Filter Button */}
            <Fab
                size="small"
                sx={{
                    position: "fixed",
                    right: 24,
                    top: 80,
                    zIndex: 1300,
                    backgroundColor: "#1E3A8A",
                    color: "#fff",
                }}
                onClick={onOpen} // ✅ call parent callback
            >
                <FilterListIcon />
            </Fab>

            {/* Drawer */}
            <Drawer anchor="right" open={open} onClose={onClose}>
                <Box width={320} p={2} sx={{ backgroundColor: "#F1F5F9", height: "100%" }}>
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

                    <TextField
                        type="date"
                        label="To Date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={toDate}
                        onChange={(e) => onToDateChange(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        select
                        label={dropdownLabel}
                        fullWidth
                        value={dropdownValue}
                        onChange={(e) => onDropdownChange(e.target.value)}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        {dropdownOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        fullWidth
                        sx={{
                            backgroundColor: "#1E3A8A",
                            color: "#fff",
                            fontWeight: 600,
                            "&:hover": { backgroundColor: "#162E6E" },
                        }}
                        onClick={onApply}
                    >
                        Apply Filter
                    </Button>
                </Box>
            </Drawer>
        </>
    );
};

export default ReportFilterDrawer;
