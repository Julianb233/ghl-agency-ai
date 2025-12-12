import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { CreditPackageCard } from '@/components/leads/CreditPackageCard';
import { CreditBalance } from '@/components/leads/CreditBalance';
import { useCredits } from '@/hooks/useCredits';
import { ArrowLeft, Coins, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { FeatureTip } from '@/components/tour/FeatureTip';

export default function CreditPurchase() {
  const [, setLocation] = useLocation();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const { getPackages, purchaseCredits, getTransactionHistory, getBalance } = useCredits();

  const { data: packagesData, isLoading: packagesLoading } = getPackages();
  const { data: historyData, isLoading: historyLoading } = getTransactionHistory();
  const { data: enrichmentBalance } = getBalance({ creditType: 'enrichment' });
  const { data: callingBalance } = getBalance({ creditType: 'calling' });

  // Extract arrays from response objects
  const packages = packagesData?.packages ?? [];
  const history = historyData?.transactions ?? [];

  const purchaseMutation = purchaseCredits;

  const handlePurchase = async (packageId: string) => {
    try {
      setSelectedPackageId(packageId);
      await purchaseMutation.mutateAsync({ packageId });
      toast.success('Credits purchased successfully!');
      setSelectedPackageId(null);
    } catch (error) {
      toast.error('Failed to purchase credits');
      setSelectedPackageId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div data-tour="credits-header">
        <Breadcrumb
          items={[
            { label: 'Dashboard', onClick: () => setLocation('/') },
            { label: 'Credits' },
          ]}
        />
        <div className="flex items-center gap-2 mt-4">
          <h1 className="text-3xl font-bold">Credits</h1>
          <FeatureTip
            tipId="credits-consumption"
            title="How Credits Work"
            content="Credits are consumed per action: 1 credit per lead enrichment, and calling credits are based on call duration. Credits never expire and can be used anytime."
            dismissible={true}
          />
        </div>
        <p className="text-muted-foreground mt-1">
          Purchase credits for lead enrichment and AI calling
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="credits-balance">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Enrichment Credits
                </p>
                <p className="text-3xl font-bold">
                  {enrichmentBalance?.balance.toLocaleString() || 0}
                </p>
              </div>
              <div className="rounded-full bg-emerald-100 p-4">
                <Coins className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Calling Credits
                </p>
                <p className="text-3xl font-bold">
                  {callingBalance?.balance.toLocaleString() || 0}
                </p>
              </div>
              <div className="rounded-full bg-teal-100 p-4">
                <Coins className="h-8 w-8 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="packages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="packages">Credit Packages</TabsTrigger>
          <TabsTrigger value="history">Purchase History</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold">Choose Your Package</h2>
              <FeatureTip
                tipId="credits-tier-differences"
                title="Package Tiers"
                content="Larger packages offer better value per credit. Choose based on your monthly usage: Starter for occasional use, Professional for regular campaigns, Enterprise for high-volume needs."
                dismissible={true}
              />
            </div>
            <p className="text-muted-foreground">
              Select a credit package that fits your needs
            </p>
          </div>

          {packagesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-48" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-tour="credits-purchase">
              {packages.map((pkg: any, index: number) => (
                <CreditPackageCard
                  key={pkg.id}
                  package={pkg}
                  onPurchase={() => handlePurchase(pkg.id)}
                  isLoading={selectedPackageId === pkg.id && purchaseMutation.isPending}
                  recommended={index === 1} // Recommend the middle package
                />
              ))}
            </div>
          )}

          <Card className="bg-accent/50" data-tour="credits-benefits">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3 shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">What You Get</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Credits never expire</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Use for lead enrichment or AI calling</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Access to premium data sources</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Real-time enrichment processing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>24/7 customer support</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6" data-tour="credits-history">
          <div>
            <h2 className="text-2xl font-bold mb-2">Purchase History</h2>
            <p className="text-muted-foreground">
              View all your credit purchases and usage
            </p>
          </div>

          {historyLoading ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64" />
              </CardContent>
            </Card>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-accent p-6 mb-4">
                  <CreditCard className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No purchases yet</h3>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Your purchase history will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-sm">
                          {formatDistanceToNow(transaction.createdAt, {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'purchase' ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.packageName || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.type === 'purchase' ? '+' : '-'}
                          {transaction.credits.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.amount
                            ? `$${transaction.amount.toFixed(2)}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === 'completed'
                                ? 'default'
                                : transaction.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
