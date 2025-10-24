import React, { useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const SalesReport: React.FC = () => {
  const [timeframe, setTimeframe] = useState('monthly');
  const [year, setYear] = useState('2024');

  // Sample data - replace with actual data from your API
  const salesData = {
    monthly: [
      { name: 'Jan', sales: 2500000, target: 3000000 },
      { name: 'Feb', sales: 2800000, target: 3000000 },
      // ...more months
    ],
    products: [
      { name: 'iPhone 15 Pro', sales: 15000000 },
      { name: 'iPhone 15', sales: 12000000 },
      { name: 'iPad Pro', sales: 8000000 },
      // ...more products
    ],
    branches: [
      { name: 'Central World', sales: 25000000, target: 30000000 },
      { name: 'Siam Paragon', sales: 22000000, target: 25000000 },
      // ...more branches
    ]
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Sales Performance Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Sales
              </Typography>
              <Typography variant="h4">
                ฿45,000,000
              </Typography>
              <Typography color="success.main">
                +15% vs Target
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Sales by Branch Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Branch Performance vs Target
            </Typography>
            <BarChart width={700} height={300} data={salesData.branches}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#8884d8" name="Actual Sales" />
              <Bar dataKey="target" fill="#82ca9d" name="Target" />
            </BarChart>
          </Paper>
        </Grid>

        {/* Product Sales Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Product Sales Distribution
            </Typography>
            <PieChart width={400} height={300}>
              <Pie
                data={salesData.products}
                dataKey="sales"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              />
              <Tooltip />
            </PieChart>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SalesReport;
