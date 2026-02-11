import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone } from 'lucide-react';
import { Wallet, NETWORK_LABELS, NetworkType } from '@/types/database';

interface NetworkWalletCardProps {
  wallets: Wallet[];
  title?: string;
}

const NETWORK_COLORS: Record<NetworkType, string> = {
  mtn: 'bg-yellow-500/10 text-yellow-600',
  zain: 'bg-red-500/10 text-red-600',
  digitel: 'bg-blue-500/10 text-blue-600',
};

export default function NetworkWalletCard({ wallets, title = 'SSP Airtime by Network' }: NetworkWalletCardProps) {
  const networkWallets = wallets.filter(w => w.currency === 'SSP' && w.network);

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {(['mtn', 'zain', 'digitel'] as NetworkType[]).map((network) => {
            const wallet = networkWallets.find(w => w.network === network);
            const balance = wallet ? Number(wallet.balance) : 0;
            return (
              <div key={network} className={`p-3 md:p-4 rounded-lg text-center ${NETWORK_COLORS[network]}`}>
                <p className="text-xs font-semibold uppercase">{NETWORK_LABELS[network]}</p>
                <p className="text-base md:text-xl font-bold mt-1 truncate">
                  SSP {balance.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
