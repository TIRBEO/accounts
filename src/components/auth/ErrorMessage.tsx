import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

export const ErrorMessage: React.FC<{
  error?: string;
  field: string;
  touched: Record<string, boolean>;
}> = ({ error, field, touched }) => {
  if (!error || !touched[field]) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs text-[var(--tb-error)] mt-1.5 flex items-center gap-1"
    >
      <AlertCircle className="w-3 h-3" />
      {error}
    </motion.p>
  );
};
