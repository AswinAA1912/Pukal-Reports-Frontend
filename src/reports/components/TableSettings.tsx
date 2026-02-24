import { Box, Switch, Typography } from "@mui/material";

const TableSettings = ({ columns, onChange }: any) => {
  return (
    <Box p={2} minWidth={250}>
      {columns.map((col: any) => (
        <Box
          key={col.key}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
        >
          <Typography fontSize="0.85rem">{col.label}</Typography>
          <Switch
            size="small"
            checked={col.enabled}
            onChange={() =>
              onChange(
                columns.map((c: any) =>
                  c.key === col.key ? { ...c, enabled: !c.enabled } : c
                )
              )
            }
          />
        </Box>
      ))}
    </Box>
  );
};

export default TableSettings;