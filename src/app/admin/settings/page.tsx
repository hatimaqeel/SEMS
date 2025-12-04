
'use client';

import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Application Settings"
        description="Manage global settings for the SEMS application."
      />

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Global configuration for the application.
            </CardDescription>
          </CardHeader>
        </Card>
    </div>
  );
}

    