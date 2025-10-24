import React from 'react';
import {
  Paper,
  Typography,
  LinearProgress,
  Box,
} from '@mui/material';

interface SalesTargetProps {
  actual: number;
  target: number;
  title: string;
}

const SalesTarget: React.FC<SalesTargetProps> = ({ actual, target, title }) => {
  const progress = Math.min((actual / target) * 100, 100);
  const status = progress >= 100 ? 'Achieved' : 'In Progress';
  const color = progress >= 100 ? 'success' : 'primary';

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">{title}</Typography>
      <Box sx={{ mt: 2 }}>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          color={color}
          sx={{ height: 10, borderRadius: 5 }}
        />
      </Box>
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2">
          {`฿${actual.toLocaleString()}`} / {`฿${target.toLocaleString()}`}
        </Typography>
        <Typography variant="body2" color={color}>
          {status} ({progress.toFixed(1)}%)
        </Typography>
      </Box>
    </Paper>
  );
};

export default SalesTarget;
