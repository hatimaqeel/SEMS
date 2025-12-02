
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/common/Header";
import { Logo } from "@/components/common/Logo";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { events } from "@/lib/placeholder-data";
import { Calendar, MapPin } from "lucide-react";

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero');
  const upcomingEvents = events;

  const getSportImage = (sportType: string) => {
    const sportImage = PlaceHolderImages.find(p => p.id === sportType.toLowerCase());
    return sportImage || PlaceHolderImages.find(p => p.id === 'basketball');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center text-center text-white">
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
              Welcome to UniSport Central
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-primary-foreground/80">
              The ultimate sports event management system for universities. Streamline your tournaments from start to finish.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/admin/dashboard">Admin Dashboard</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Login / Register</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="tournaments" className="py-12 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 font-headline">Upcoming Tournaments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.slice(0, 3).map((event) => {
                const sportImage = getSportImage(event.sportType);
                return (
                  <Card key={event.eventId} className="overflow-hidden bg-card hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="p-0">
                      <div className="relative h-48 w-full">
                        {sportImage && (
                           <Image
                            src={sportImage.imageUrl}
                            alt={sportImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={sportImage.imageHint}
                          />
                        )}
                      </div>
                      <div className="p-6">
                        <Badge variant="secondary" className="mb-2">{event.sportType}</Badge>
                        <CardTitle className="font-headline text-2xl">{event.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-muted-foreground text-sm mb-2">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>{new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground text-sm">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{event.department} Department</span>
                      </div>
                       <Button asChild className="w-full mt-6">
                        <Link href={`/events/${event.eventId}`}>View Details</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
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
            &copy; {new Date().getFullYear()} UniSport Central. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
