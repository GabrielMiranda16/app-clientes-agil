import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

const MetricCard = ({ title, value, icon, color, isCurrency = false }) => {
  const IconComponent = icon;
  
  const formattedValue = isCurrency 
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
    : value;

  return (
    <motion.div
      whileHover={{ }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className="hover:border-blue-400 transition-colors duration-300 shadow-sm hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          {IconComponent && (
            <div className="bg-[#003580]/10 p-2 rounded-xl shrink-0">
              <IconComponent className="h-5 w-5 text-[#003580]" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{formattedValue}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MetricCard;