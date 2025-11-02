import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  actionButtonText?: string;
  onActionButtonClick?: () => void;
}

export function PageHeader({ title, description, actionButtonText, onActionButtonClick }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {actionButtonText && onActionButtonClick && (
        <Button onClick={onActionButtonClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {actionButtonText}
        </Button>
      )}
    </div>
  );
}
