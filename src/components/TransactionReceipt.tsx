import { forwardRef } from 'react';
import { format } from 'date-fns';
import { TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS, CurrencyCode, TransactionType } from '@/types/database';

interface ReceiptData {
  transactionId: string;
  serviceType: TransactionType;
  clientName: string;
  clientPhone: string;
  amount: number;
  fee: number;
  currency: CurrencyCode;
  agentName: string;
  date: Date;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  location?: string;
}

interface TransactionReceiptProps {
  data: ReceiptData;
}

const TransactionReceipt = forwardRef<HTMLDivElement, TransactionReceiptProps>(
  ({ data }, ref) => {
    const {
      transactionId,
      serviceType,
      clientName,
      clientPhone,
      amount,
      fee,
      currency,
      agentName,
      date,
      status,
      location,
    } = data;

    const total = amount + fee;
    const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
    
    // Mask phone number for privacy
    const maskedPhone = clientPhone.length > 6 
      ? clientPhone.slice(0, 4) + '****' + clientPhone.slice(-2)
      : clientPhone;

    const getStatusColor = () => {
      switch (status) {
        case 'SUCCESS': return 'text-green-700';
        case 'PENDING': return 'text-yellow-700';
        case 'FAILED': return 'text-red-700';
        default: return 'text-gray-700';
      }
    };

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-6 max-w-[300px] mx-auto font-mono text-sm print:p-4 print:max-w-none"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
          <h1 className="text-lg font-bold tracking-wider">WONDERS M LTD</h1>
          <p className="text-xs italic mt-1">With Wonders, You Will Never Regret</p>
          <p className="text-xs mt-2 font-semibold">RECEIPT</p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-2 border-b-2 border-dashed border-gray-400 pb-4 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Transaction ID:</span>
            <span className="font-semibold">{transactionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-semibold">{TRANSACTION_TYPE_LABELS[serviceType]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Client:</span>
            <span className="font-semibold">{clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span className="font-semibold">{maskedPhone}</span>
          </div>
        </div>

        {/* Amount Section */}
        <div className="space-y-2 border-b-2 border-dashed border-gray-400 pb-4 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold">{currencySymbol} {amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fee:</span>
            <span className="font-semibold">{currencySymbol} {fee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2 mt-2">
            <span>Total:</span>
            <span>{currencySymbol} {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Agent & Status */}
        <div className="space-y-2 border-b-2 border-dashed border-gray-400 pb-4 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Agent:</span>
            <span className="font-semibold">{agentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-semibold">{format(date, 'dd-MM-yyyy HH:mm')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={`font-bold ${getStatusColor()}`}>{status}</span>
          </div>
          {location && (
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-semibold text-right text-xs">{location}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs space-y-1">
          <p className="font-semibold">Support: +211 921 175 411</p>
          <p className="text-gray-500 mt-2">Thank you for your business!</p>
          <p className="text-gray-400 text-[10px] mt-1">Keep this receipt for your records</p>
        </div>

        {/* Decorative bottom border */}
        <div className="mt-4 text-center text-gray-300 text-xs tracking-widest">
          ================================
        </div>
      </div>
    );
  }
);

TransactionReceipt.displayName = 'TransactionReceipt';

export default TransactionReceipt;
