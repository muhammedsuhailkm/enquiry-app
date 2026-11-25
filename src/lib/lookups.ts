import "server-only";
import { prisma } from "./db";
import { notFound } from "./api";
import { LOOKUP_TYPES, type LookupType } from "./constants";

// The three lookup tables have identical shapes, so one delegate type covers them all.
type LookupDelegate = typeof prisma.workType;

export function lookupDelegate(type: string): LookupDelegate {
  if (!(LOOKUP_TYPES as readonly string[]).includes(type)) throw notFound("Unknown lookup type");
  const map: Record<LookupType, unknown> = {
    "work-types": prisma.workType,
    categories: prisma.category,
    "lead-sources": prisma.leadSource,
  };
  return map[type as LookupType] as LookupDelegate;
}
