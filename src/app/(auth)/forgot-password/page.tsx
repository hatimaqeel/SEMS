import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

const ForgotPasswordClientPage = dynamic(
  () => import('@/components/auth/ForgotPasswordClientPage'),
  {
    ssr: false,
    loading: () => (
      <Card className="mx-auto max-w-sm">
        <CardHeader className="space-y-2 text-center">
            <Skeleton className="h-10 w-10 mx-auto rounded-full" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="p-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
            </div>
        </CardContent>
      </Card>
    ),
  }
);

export default function ForgotPasswordPage() {
  return <ForgotPasswordClientPage />;
}
