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

interface AppSettings {
    secretKey: string;
}

export default function SettingsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [secretKey, setSecretKey] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'app'), [firestore]);
    const { data: settings, isLoading } = useDoc<AppSettings>(settingsRef);

    useEffect(() => {
        if (settings) {
            setSecretKey(settings.secretKey);
        }
    }, [settings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await setDoc(settingsRef, { secretKey });
            toast({
                title: 'Settings Saved',
                description: 'The new secret key has been saved successfully.',
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

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>
                        Manage security-related settings for the application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
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
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Secret Key
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
