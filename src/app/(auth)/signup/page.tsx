import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Logo } from "@/components/common/Logo"

export default function SignupPage() {
  return (
    <Card className="mx-auto max-w-md w-full">
      <CardHeader className="space-y-2 text-center">
         <div className="flex justify-center">
            <Logo />
        </div>
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Choose your role and enter your details to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="student">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="admin">Administrator</TabsTrigger>
          </TabsList>
          <TabsContent value="student">
            <form className="grid gap-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="student-name">Name</Label>
                <Input id="student-name" placeholder="John Doe" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reg-number">Registration Number</Label>
                <Input id="reg-number" placeholder="CS-2021-001" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-dept">Department</Label>
                <Select>
                  <SelectTrigger id="student-dept">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cs">Computer Science</SelectItem>
                    <SelectItem value="se">Software Engineering</SelectItem>
                    <SelectItem value="math">Mathematics</SelectItem>
                    <SelectItem value="physics">Physics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="student-gender">Gender</Label>
                <Select>
                  <SelectTrigger id="student-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-email">Email</Label>
                <Input id="student-email" type="email" placeholder="m@example.com" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-password">Password</Label>
                <Input id="student-password" type="password" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-confirm-password">Confirm Password</Label>
                <Input id="student-confirm-password" type="password" />
              </div>
              <Button type="submit" className="w-full">
                Create student account
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="admin">
            <form className="grid gap-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-name">Name</Label>
                <Input id="admin-name" placeholder="Admin User" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-dept">Department</Label>
                <Input id="admin-dept" placeholder="Administration" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" placeholder="admin@example.com" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" type="password" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-confirm-password">Confirm Password</Label>
                <Input id="admin-confirm-password" type="password" />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="secret-key">Secret Key</Label>
                <Input id="secret-key" type="password" placeholder="Enter organization secret" />
              </div>
              <Button type="submit" className="w-full">
                Create admin account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
