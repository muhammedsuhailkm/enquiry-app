"use client";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errMsg, formData } from "../../_ui/api";
import { ModePicker } from "../../_ui/ModePicker";
import { PageHeader } from "../../_ui/PageHeader";
import { initials, useMeContext } from "../../_ui/useMe";

/** Change own password (current + new + confirm) in a dialog opened from the profile card. */
function ResetPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const currentPassword = String(f.get("currentPassword"));
    const newPassword = String(f.get("newPassword"));
    if (newPassword !== String(f.get("confirmPassword"))) return toast.error("New passwords don't match");
    setBusy(true);
    try {
      await api("/api/profile/password", "POST", { currentPassword, newPassword });
      toast.success("Password changed");
      onOpenChange(false);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Enter your current password, then choose a new one (at least 8 characters).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required autoFocus autoComplete="current-password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" name="newPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProfilePage() {
  const { me, setMe } = useMeContext();
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  if (!me)
    return (
      <div className="grid w-full max-w-3xl gap-6">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );

  return (
    <div className="grid w-full max-w-3xl gap-6">
      <PageHeader title="Profile" description="Your account details and password." />

      <Card>
        <form
          className="grid gap-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = formData(e.currentTarget);
            setSaving(true);
            try {
              setMe(await api("/api/profile", "PATCH", { ...body, phone: body.phone ?? null }));
              toast.success("Profile saved");
            } catch (err) {
              toast.error(errMsg(err));
            } finally {
              setSaving(false);
            }
          }}
        >
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="text-base font-semibold">{initials(me.name)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 gap-1.5">
                <span className="truncate text-sm font-medium">{me.name}</span>
                <Badge variant="secondary" className="justify-self-start">
                  {me.role === "ADMIN" ? "Admin" : "Employee"}
                </Badge>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" required maxLength={100} defaultValue={me.name} />
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={me.email} disabled />
                <p className="text-xs text-muted-foreground">Ask an admin to change your email.</p>
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" name="designation" required maxLength={100} defaultValue={me.designation} />
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" maxLength={30} defaultValue={me.phone ?? ""} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setPwOpen(true)}>
              <KeyRound />
              Reset password
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ModePicker />
        </CardContent>
      </Card>

      <ResetPasswordDialog key={pwOpen ? "open" : "closed"} open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}
