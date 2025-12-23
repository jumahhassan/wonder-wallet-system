import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Printer, X } from 'lucide-react';
import TransactionReceipt from './TransactionReceipt';
import { CurrencyCode, TransactionType } from '@/types/database';

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

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
}

export default function ReceiptDialog({ open, onOpenChange, data }: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${data?.transactionId || 'transaction'}`,
  });

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Transaction Receipt
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[70vh] overflow-auto bg-gray-100 p-4">
          <TransactionReceipt ref={receiptRef} data={data} />
        </div>

        <DialogFooter className="p-4 pt-2 gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-1" />
            Close
          </Button>
          <Button 
            onClick={() => handlePrint()}
            className="flex-1"
          >
            <Printer className="w-4 h-4 mr-1" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
