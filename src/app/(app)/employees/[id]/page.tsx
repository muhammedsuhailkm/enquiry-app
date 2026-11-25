"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, qs, type Json } from "../../../_ui/api";
import { DateRangeFilter, formatDate, type Range } from "../../../_ui/PageHeader";
import { DashboardBody, DashboardSkeleton } from "../../../_ui/Stats";
import { customerLabel } from "../../../_ui/customer";
import { EnquiryNo, WorkTypeTags } from "../../../_ui/EnquiryNo";
import { StatusBadge } from "../../../_ui/StatusControl";
import { initials } from "../../../_ui/useMe";

export default function EmployeeAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [range, setRange] = useState<Range>({});
  const [d, setD] = useState<Json>(null);
  const [recent, setRecent] = useState<Json[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/dashboard/employees/${id}?${qs({ ...range })}`).then(setD).catch((e) => setError(errMsg(e)));
    api(`/api/enquiries?${qs({ salespersonId: id, pageSize: 5, ...range })}`)
      .then((r) => setRecent(r.items))
      .catch((e) => toast.error(errMsg(e)));
  }, [id, range]);

  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load employee</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  const emp = d?.employee;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-14 shrink-0">
            <AvatarFallback className="text-base font-semibold">{initials(emp?.name)}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{emp?.name ?? "…"}</h1>
              {emp && <Badge variant="secondary">{emp.role === "ADMIN" ? "Admin" : "Employee"}</Badge>}
              {emp &&
                (emp.isActive ? (
                  <Badge variant="outline" className="border-success-border bg-success-bg text-success-fg">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                ))}
            </div>
            {emp && (
              <span className="text-sm break-words text-muted-foreground">
                {[emp.designation, emp.email, emp.phone].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto max-md:*:flex-1">
          <DateRangeFilter value={range} onChange={setRange} />
          <Button variant="outline" asChild className="bg-background max-md:hidden">
            <Link href="/employees">Manage employees</Link>
          </Button>
        </div>
      </div>

      {d ? <DashboardBody d={d} /> : <DashboardSkeleton />}

      <Card className="gap-0 pb-2">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Recent enquiries</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/enquiries">View all</Link>
          </Button>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Enquiry no.</TableHead>
              <TableHead className="max-md:hidden">Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="max-md:hidden">Work type</TableHead>
              <TableHead className="pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No enquiries in this period.
                </TableCell>
              </TableRow>
            )}
            {recent?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-6">
                  <EnquiryNo id={r.id} no={r.enquiryNo} />
                </TableCell>
                <TableCell className="text-muted-foreground max-md:hidden">{formatDate(r.enquiryDate)}</TableCell>
                <TableCell className="max-md:max-w-36 max-md:truncate">
                  {customerLabel(r.customer).title}
                  {customerLabel(r.customer).contact && (
                    <span className="text-muted-foreground max-md:hidden"> · {customerLabel(r.customer).contact}</span>
                  )}
                </TableCell>
                <TableCell className="max-md:hidden">
                  <WorkTypeTags items={r.workTypes} />
                </TableCell>
                <TableCell className="pr-6">
                  <StatusBadge status={r.status} revisionNo={r.revisionNo} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
