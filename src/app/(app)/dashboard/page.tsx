"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errMsg, qs, type Json } from "../../_ui/api";
import { DateRangeFilter, PageHeader, type Range } from "../../_ui/PageHeader";
import { DashboardBody, DashboardSkeleton } from "../../_ui/Stats";
import { useMe } from "../../_ui/useMe";

export default function DashboardPage() {
  const me = useMe();
  const admin = me?.role === "ADMIN";
  const [range, setRange] = useState<Range>({});
  const [salesperson, setSalesperson] = useState("all");
  const [people, setPeople] = useState<Json[]>([]);
  const [d, setD] = useState<Json>(null);

  useEffect(() => {
    const sp = salesperson === "all" ? undefined : salesperson;
    api(`/api/dashboard?${qs({ ...range, salespersonId: sp })}`)
      .then(setD)
      .catch((e) => toast.error(errMsg(e)));
  }, [range, salesperson]);
  useEffect(() => {
    if (admin) api("/api/employees").then(setPeople).catch(() => {});
  }, [admin]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={admin ? "Enquiry volume, conversions and lost reasons across your team." : "Your enquiries, conversions and lost reasons."}
      >
        <DateRangeFilter value={range} onChange={setRange} />
        {admin && (
          <Select value={salesperson} onValueChange={setSalesperson}>
            <SelectTrigger className="bg-background md:w-48" aria-label="Salesperson">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All salespeople</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PageHeader>
      {d ? <DashboardBody d={d} /> : <DashboardSkeleton />}
    </>
  );
}
