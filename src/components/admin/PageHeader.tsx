import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}
