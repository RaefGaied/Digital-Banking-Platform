export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
};

export const formatAccountNumber = (number: string): string => {
  return number.replace(/(\\d{5})(\\d{1})/, '-');
};

export const getTransactionLabel = (type: string): string => {
  const labels: Record<string, string> = {
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    TRANSFER: 'Transfer',
  };
  return labels[type] || type;
};

export const getTransactionColor = (type: string): string => {
  const colors: Record<string, string> = {
    DEPOSIT: 'text-emerald-400',
    WITHDRAWAL: 'text-red-400',
    TRANSFER: 'text-blue-400',
  };
  return colors[type] || 'text-gray-400';
};
