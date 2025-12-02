import Link from "next/link";
import { Trophy } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" prefetch={false}>
      <Trophy className="h-6 w-6 text-primary" />
      <span className="font-bold text-lg font-headline">SEMS</span>
    </Link>
  );
}
