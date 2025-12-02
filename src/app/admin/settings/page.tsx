
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader, Save } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [secretKey, setSecretKey] = useState('');
    const [schedulingWindow, setSchedulingWindow] = useState('12');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'app'), [firestore]);
    const { data: settings, isLoading } = useDoc<AppSettings>(settingsRef);

    useEffect(() => {
        if (settings) {
            setSecretKey(settings.secretKey || 'unisport@cust2025');
            setSchedulingWindow((settings.eventSchedulingWindowMonths || 12).toString());
        } else if (!isLoading) {
            // If settings are not loading and don't exist, set the default
            setSecretKey('unisport@cust2025');
        }
    }, [settings, isLoading]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const windowInMonths = parseInt(schedulingWindow, 10);
            if (isNaN(windowInMonths) || windowInMonths <= 0) {
                 toast({
                    variant: 'destructive',
                    title: 'Invalid Input',
                    description: 'Scheduling window must be a positive number.',
                });
                setIsSubmitting(false);
                return;
            }

            await setDoc(settingsRef, { 
                secretKey,
                eventSchedulingWindowMonths: windowInMonths,
            }, { merge: true });
            
            toast({
                title: 'Settings Saved',
                description: 'Your application settings have been updated successfully.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error Saving Settings',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader className="animate-spin" /> Loading settings...</div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Application Settings"
                description="Manage global settings for UniSport Central."
            />

            <form onSubmit={handleSave}>
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>
                            Manage security-related settings for the application.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="secret-key">Admin Secret Key</Label>
                            <Input
                                id="secret-key"
                                type="password"
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                placeholder="Enter a new secret key"
                                disabled={isSubmitting}
                            />
                            <p className="text-sm text-muted-foreground">
                                This key is required for creating new administrator accounts.
                            </p>
                        </div>
                    </CardContent>
                    <CardHeader className="pt-4">
                        <CardTitle>Scheduling</CardTitle>
                        <CardDescription>
                           Configure event scheduling parameters.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-2">
                            <Label htmlFor="scheduling-window">Event Scheduling Window (Months)</Label>
                            <Input
                                id="scheduling-window"
                                type="number"
                                value={schedulingWindow}
                                onChange={(e) => setSchedulingWindow(e.target.value)}
                                placeholder="e.g., 12"
                                disabled={isSubmitting}
                            />
                            <p className="text-sm text-muted-foreground">
                                The maximum number of months in advance an event can be scheduled.
                            </p>
                        </div>
                    </CardContent>
                </Card>
                
                 <Button type="submit" disabled={isSubmitting} className="mt-6">
                    {isSubmitting ? (
                        <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save All Settings
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
