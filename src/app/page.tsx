
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/common/Header";
import { Logo } from "@/components/common/Logo";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero');

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <section className="relative w-full h-[calc(100vh-56px)] flex items-center justify-center text-center text-white">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              priority
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 p-4">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight font-headline">
              Welcome to SEMS
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-primary-foreground/80">
              The ultimate sports event management system for universities. Streamline your tournaments from start to finish.
            </p>
            <div className="mt-8 flex justify-center gap-4">
               <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/login?type=admin">Admin Dashboard</Link>
              </Button>
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/login">Student Dashboard</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 bg-card border-t">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <div className="mb-4 md:mb-0">
            <Logo />
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SEMS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
