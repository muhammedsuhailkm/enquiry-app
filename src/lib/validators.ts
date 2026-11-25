import { z } from "zod";
import { ENQUIRY_STATUSES, ROLES } from "./constants";

const req = (max: number) => z.string().trim().min(1, "Required").max(max);
const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)); // "" -> null
const id = z.coerce.number().int().positive();
const isoDate = z.iso.date(); // YYYY-MM-DD

export const passwordSchema = z.string().min(8, "Min 8 characters").max(128);

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

// ---------- customers ----------
// Company first: the company is "the customer", `name` is the contact person there.
export const customerSchema = z.object({
  companyName: req(150),
  name: req(150), // contact name
  phone: opt(30),
  email: z.union([z.email().trim().toLowerCase(), z.literal(""), z.null()]).optional().transform((v) => v || null),
  address: opt(500),
});
export const customerUpdateSchema = customerSchema.partial();

// ---------- lookups ----------
export const lookupCreateSchema = z.object({ name: req(100) });
export const lookupUpdateSchema = z.object({ name: req(100).optional(), isActive: z.boolean().optional() });

export const subWorkTypeCreateSchema = z.object({ workTypeId: id, name: req(150) });
export const subWorkTypeUpdateSchema = z.object({ name: req(150).optional(), isActive: z.boolean().optional() });

// ---------- work scope (multi work type + sub work type) ----------
const idList = (max: number) =>
  z
    .array(id)
    .max(max)
    .transform((a) => [...new Set(a)]); // de-duplicate

/** At least one work type; sub work types optional (their parent work type is added automatically). */
export const workScopeSchema = z.object({
  workTypeIds: idList(50).refine((a) => a.length > 0, "Select at least one work type"),
  subWorkTypeIds: idList(500).default([]),
});

// ---------- enquiries ----------
const enquiryFields = {
  ...workScopeSchema.shape,
  categoryId: id,
  leadSourceId: id,
  enquiryDate: isoDate.optional(), // defaults to today on create
  scopeOfWork: req(10_000),
  additionalDetails: opt(10_000),
  salespersonId: id.optional(), // admin only
};

export const enquiryCreateSchema = z
  .object({
    customerId: id.optional(),
    newCustomer: customerSchema.optional(),
    ...enquiryFields,
  })
  .refine((v) => !!v.customerId !== !!v.newCustomer, {
    message: "Select an existing customer or add a new one (not both)",
    path: ["customerId"],
  });

export const enquiryUpdateSchema = z
  .object({
    customerId: id.optional(),
    newCustomer: customerSchema.optional(),
    ...enquiryFields,
    scopeOfWork: req(10_000).optional(),
    workTypeIds: workScopeSchema.shape.workTypeIds.optional(),
    subWorkTypeIds: idList(500).optional(),
    categoryId: id.optional(),
    leadSourceId: id.optional(),
  })
  .refine((v) => !(v.customerId && v.newCustomer), {
    message: "Use either customerId or newCustomer",
    path: ["customerId"],
  })
  // Work scope is replaced as a whole, so sub work types only make sense together with work types.
  .refine((v) => v.subWorkTypeIds === undefined || v.workTypeIds !== undefined, {
    message: "Send workTypeIds together with subWorkTypeIds",
    path: ["workTypeIds"],
  });

export const enquiryListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  salespersonId: id.optional(),
  customerId: id.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  q: z.string().trim().max(100).optional(),
});

export const statusChangeSchema = z
  .object({
    to: z.enum(["QUOTED", "ACCEPTED", "REJECTED", "CANCELLED"]),
    remarks: opt(1000),
    lostReason: opt(500),
    quoteNo: opt(50), // Zoho quotation number
  })
  .refine((v) => v.to !== "QUOTED" || !!v.quoteNo, {
    message: "Quote number is required when quoting or revising",
    path: ["quoteNo"],
  })
  .refine((v) => v.to !== "REJECTED" || !!v.lostReason, {
    message: "Lost reason is required when rejecting",
    path: ["lostReason"],
  })
  .refine((v) => v.to !== "CANCELLED" || !!v.remarks, {
    message: "Reason is required when cancelling",
    path: ["remarks"],
  });

export const reopenSchema = z.object({ remarks: req(1000) });

// ---------- users ----------
export const employeeCreateSchema = z.object({
  name: req(100),
  email: z.email().trim().toLowerCase().max(255),
  designation: req(100),
  phone: opt(30),
  role: z.enum(ROLES).default("EMPLOYEE"),
  password: passwordSchema.optional(), // falls back to DEFAULT_EMPLOYEE_PASSWORD
});

export const employeeUpdateSchema = z.object({
  name: req(100).optional(),
  email: z.email().trim().toLowerCase().max(255).optional(),
  designation: req(100).optional(),
  phone: opt(30),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const adminSetPasswordSchema = z.object({
  password: passwordSchema.optional(), // omitted -> reset to default
});

export const profileUpdateSchema = z.object({
  name: req(100).optional(),
  designation: req(100).optional(),
  phone: opt(30),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  });

export const dateRangeQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  salespersonId: id.optional(),
});
