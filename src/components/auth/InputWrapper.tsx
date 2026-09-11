import React from 'react';
import { ErrorMessage } from './ErrorMessage';

export const InputWrapper: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
  field: string;
  touched: Record<string, boolean>;
}> = ({ label, required, children, error, field, touched }) => (
  <div>
    <label className="tb-label">
      {label} {required && <span className="text-[var(--tb-text)]">*</span>}
    </label>
    {children}
    <ErrorMessage error={error} field={field} touched={touched} />
  </div>
);
