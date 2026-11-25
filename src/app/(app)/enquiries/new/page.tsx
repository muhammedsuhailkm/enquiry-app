"use client";
import { EnquiryForm } from "../../../_ui/EnquiryForm";
import { PageHeader } from "../../../_ui/PageHeader";

export default function NewEnquiryPage() {
  return (
    <div className="grid w-full max-w-4xl gap-6">
      <PageHeader
        title="New enquiry"
        description="The enquiry number is generated on save (ENQ-YYYY-####) and starts as Received."
      />
      <EnquiryForm />
    </div>
  );
}
