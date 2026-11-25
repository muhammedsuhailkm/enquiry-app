"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Info, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errMsg, type Json } from "../../../../_ui/api";
import { EnquiryForm } from "../../../../_ui/EnquiryForm";
import { PageHeader } from "../../../../_ui/PageHeader";
import { StatusBadge } from "../../../../_ui/StatusControl";

export default function EditEnquiryPage() {
  const { id } = useParams<{ id: string }>();
  const [enq, setEnq] = useState<Json>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`/api/enquiries/${id}`).then(setEnq).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load enquiry</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!enq) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="grid w-full max-w-4xl gap-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Edit {enq.enquiryNo}
            <StatusBadge status={enq.status} revisionNo={enq.revisionNo} />
          </span>
        }
        description="Status is changed from the enquiry page."
      />
      {enq.canEdit ? (
        <>
          <Alert>
            <Info />
            <AlertTitle>Only open enquiries can be edited</AlertTitle>
            <AlertDescription>Once accepted, rejected or cancelled, an admin must reopen it first.</AlertDescription>
          </Alert>
          <EnquiryForm initial={enq} />
        </>
      ) : (
        <Alert>
          <Lock />
          <AlertTitle>This enquiry is closed</AlertTitle>
          <AlertDescription>
            <p>Closed enquiries can&apos;t be edited. An admin can reopen it from the enquiry page.</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href={`/enquiries/${enq.id}`}>Back to enquiry</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
