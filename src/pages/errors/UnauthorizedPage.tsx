import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <ShieldX className="h-24 w-24 text-destructive/40" />
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground">Access Denied</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        You don't have permission to access this page.
      </p>
      <Button asChild className="mt-8">
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
