import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <FileQuestion className="h-24 w-24 text-muted-foreground/40" />
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-8">
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
