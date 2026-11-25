// Seeds the admin account, the work-scope catalogue and the standard lead sources
// (all idempotent - safe to re-run). Customers, enquiries and categories are created via the app.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import { dbPoolConfig } from "../src/lib/db-config";

/** Work types (in display order) and their sub work types (in display order). */
const WORK_SCOPE: { name: string; subs: string[] }[] = [
  {
    name: "Floors",
    subs: [
      "Vinyl Flooring",
      "Rubber Flooring",
      "Artificial Grass (Sports & Landscaping)",
      "Parquet Flooring",
      "Engineered Wood",
      "Solid Wood",
      "WPC Decking",
      "SPC Flooring",
      "LVT Flooring",
      "Carpets",
      "Raised Access Floors",
      "Entrance Mats",
      "Equestrian Flooring",
      "Gym Flooring",
      "Wet Area Mats",
      "ESD Flooring",
      "Ballistic Flooring",
    ],
  },
  {
    name: "Walls",
    subs: [
      "Wall Papers",
      "Window Blinds (Manual & Motorized)",
      "Curtains",
      "Wall Panelling",
      "Equestrian Walls",
      "Sports Wall Protection",
      "Corner Guard",
      "Vinyl Walls",
      "Acoustic Wall Panelling",
      "Fabric Wall Panelling",
      "Wall Guards",
      "Ballistic Walls & Ceiling",
      "Wall Painting",
      "Glass Partition",
      "Pole Protection",
    ],
  },
  {
    name: "Furniture",
    subs: [
      "School Furniture",
      "Office Furniture",
      "Outdoor Furniture",
      "Hospitality Furniture",
      "Kindergarten Furniture",
      "Lab Furniture",
      "Control Room Furniture",
    ],
  },
  {
    name: "Acoustics",
    subs: ["Acoustic Flooring Solutions", "Acoustic Wall Solutions", "Acoustic Ceiling Solutions"],
  },
  {
    name: "Sports Infrastructure",
    subs: [
      "Indoor & Outdoor Sports Flooring",
      "Sports Equipments",
      "Play Equipments",
      "Sports Seating",
      "Outdoor Fitness Equipment",
      "Padel Court",
      "Squash Court",
      "Pickle Ball Court",
      "Sports Fencing",
      "Sports Lighting",
      "Tennis Court",
      "Volleyball Court",
      "Football Court",
      "Basketball Court",
      "Cricket Pitch",
      "Martial Arts Infra",
    ],
  },
  {
    name: "Civil Specialties",
    subs: ["Waterproofing", "Epoxy Flooring", "Cementitious Self Levelling", "Coring", "Grinding", "Concrete Cutting"],
  },
];

/** Where enquiries come from (shown alphabetically in the dropdown). */
const LEAD_SOURCES = [
  "Self",
  "Website",
  "Referral",
  "Existing Client",
  "Walk-in",
  "Phone Call",
  "Email",
  "WhatsApp",
  "Social Media",
  "Google Search",
  "Exhibition / Event",
  "Architect / Consultant",
  "Contractor",
  "Tender / Bid",
];

async function seedAdmin(prisma: PrismaClient) {
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const designation = process.env.SEED_ADMIN_DESIGNATION ?? "Admin";
  if (!email || !password || password.length < 8) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 8 chars) in .env");
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`Admin ${email} already exists (id ${existing.id}) - left unchanged.`);
    return;
  }
  const admin = await prisma.user.create({
    data: { name, email, designation, role: "ADMIN", passwordHash: await hash(password) },
    select: { id: true, email: true },
  });
  console.log(`Created admin ${admin.email} (id ${admin.id}).`);
}

/**
 * Creates missing work types / sub work types and sets the catalogue order.
 * Never renames, deactivates or deletes anything an admin changed in the app.
 */
async function seedWorkScope(prisma: PrismaClient) {
  let createdTypes = 0;
  let createdSubs = 0;

  for (const [i, wt] of WORK_SCOPE.entries()) {
    const existing = await prisma.workType.findUnique({ where: { name: wt.name }, select: { id: true } });
    const type = existing
      ? await prisma.workType.update({ where: { id: existing.id }, data: { sortOrder: i + 1 }, select: { id: true } })
      : await prisma.workType.create({ data: { name: wt.name, sortOrder: i + 1 }, select: { id: true } });
    if (!existing) createdTypes++;

    const have = new Set(
      (await prisma.subWorkType.findMany({ where: { workTypeId: type.id }, select: { name: true } })).map((s) => s.name),
    );
    const missing = wt.subs.map((name, j) => ({ name, sortOrder: j + 1 })).filter((s) => !have.has(s.name));
    if (missing.length) {
      await prisma.subWorkType.createMany({ data: missing.map((s) => ({ ...s, workTypeId: type.id })) });
      createdSubs += missing.length;
    }
  }
  console.log(`Work scope: ${createdTypes} work types and ${createdSubs} sub work types created (existing ones kept).`);
}

/** Creates missing lead sources; never touches ones an admin renamed or deactivated. */
async function seedLeadSources(prisma: PrismaClient) {
  // LeadSource.name is CITEXT (case-insensitive, like the old SQL Server collation), so "website" already counts as "Website".
  const have = new Set((await prisma.leadSource.findMany({ select: { name: true } })).map((l) => l.name.toLowerCase()));
  const missing = LEAD_SOURCES.filter((n) => !have.has(n.toLowerCase()));
  if (missing.length) await prisma.leadSource.createMany({ data: missing.map((name) => ({ name })) });
  console.log(`Lead sources: ${missing.length} created (existing ones kept).`);
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg(dbPoolConfig()) });

  try {
    await seedAdmin(prisma);
    await seedWorkScope(prisma);
    await seedLeadSources(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
