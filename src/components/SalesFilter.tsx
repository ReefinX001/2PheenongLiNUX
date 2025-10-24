import React from 'react';
import {
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';

interface SalesFilterProps {
  onFilterChange: (filters: any) => void;
}

const SalesFilter: React.FC<SalesFilterProps> = ({ onFilterChange }) => {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Time Period</InputLabel>
            <Select
              defaultValue="monthly"
              label="Time Period"
              onChange={(e) => onFilterChange({ period: e.target.value })}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Branch</InputLabel>
            <Select
              defaultValue="all"
              label="Branch"
              onChange={(e) => onFilterChange({ branch: e.target.value })}
            >
              <MenuItem value="all">All Branches</MenuItem>
              <MenuItem value="central">Central World</MenuItem>
              <MenuItem value="siam">Siam Paragon</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            type="date"
            label="Start Date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            onChange={(e) => onFilterChange({ startDate: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            type="date"
            label="End Date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            onChange={(e) => onFilterChange({ endDate: e.target.value })}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SalesFilter;
