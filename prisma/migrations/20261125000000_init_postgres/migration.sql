-- Initial PostgreSQL schema (port of the three SQL Server migrations: init, work_scope, quote_number).

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Case-insensitive text for lookup names (citext is a trusted extension: the DB owner can enable it,
-- and it is available on AWS RDS / Aurora, Neon, Supabase, etc.)
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
    "designation" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "companyName" VARCHAR(150),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "address" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkType" (
    "id" SERIAL NOT NULL,
    "name" CITEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubWorkType" (
    "id" SERIAL NOT NULL,
    "workTypeId" INTEGER NOT NULL,
    "name" CITEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubWorkType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryWorkType" (
    "enquiryId" INTEGER NOT NULL,
    "workTypeId" INTEGER NOT NULL,

    CONSTRAINT "EnquiryWorkType_pkey" PRIMARY KEY ("enquiryId","workTypeId")
);

-- CreateTable
CREATE TABLE "EnquirySubWorkType" (
    "enquiryId" INTEGER NOT NULL,
    "subWorkTypeId" INTEGER NOT NULL,

    CONSTRAINT "EnquirySubWorkType_pkey" PRIMARY KEY ("enquiryId","subWorkTypeId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" CITEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" SERIAL NOT NULL,
    "name" CITEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquirySequence" (
    "year" INTEGER NOT NULL,
    "lastNo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EnquirySequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" SERIAL NOT NULL,
    "enquiryNo" VARCHAR(20) NOT NULL,
    "customerId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "leadSourceId" INTEGER NOT NULL,
    "enquiryDate" DATE NOT NULL,
    "scopeOfWork" TEXT NOT NULL,
    "additionalDetails" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" VARCHAR(100) NOT NULL,
    "createdByDesignation" VARCHAR(100) NOT NULL,
    "salespersonId" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    "revisionNo" INTEGER NOT NULL DEFAULT 0,
    "quoteNo" VARCHAR(50),
    "lostReason" VARCHAR(500),
    "closedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryStatusHistory" (
    "id" SERIAL NOT NULL,
    "enquiryId" INTEGER NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "fromStatus" VARCHAR(20),
    "toStatus" VARCHAR(20) NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "quoteNo" VARCHAR(50),
    "remarks" VARCHAR(1000),
    "changedById" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkType_name_key" ON "WorkType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubWorkType_workTypeId_name_key" ON "SubWorkType"("workTypeId", "name");

-- CreateIndex
CREATE INDEX "EnquiryWorkType_workTypeId_idx" ON "EnquiryWorkType"("workTypeId");

-- CreateIndex
CREATE INDEX "EnquirySubWorkType_subWorkTypeId_idx" ON "EnquirySubWorkType"("subWorkTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_name_key" ON "LeadSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_enquiryNo_key" ON "Enquiry"("enquiryNo");

-- CreateIndex
CREATE INDEX "Enquiry_isDeleted_salespersonId_status_idx" ON "Enquiry"("isDeleted", "salespersonId", "status");

-- CreateIndex
CREATE INDEX "Enquiry_isDeleted_enquiryDate_idx" ON "Enquiry"("isDeleted", "enquiryDate");

-- CreateIndex
CREATE INDEX "Enquiry_customerId_idx" ON "Enquiry"("customerId");

-- CreateIndex
CREATE INDEX "EnquiryStatusHistory_enquiryId_changedAt_idx" ON "EnquiryStatusHistory"("enquiryId", "changedAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubWorkType" ADD CONSTRAINT "SubWorkType_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "WorkType"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EnquiryWorkType" ADD CONSTRAINT "EnquiryWorkType_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EnquiryWorkType" ADD CONSTRAINT "EnquiryWorkType_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "WorkType"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EnquirySubWorkType" ADD CONSTRAINT "EnquirySubWorkType_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EnquirySubWorkType" ADD CONSTRAINT "EnquirySubWorkType_subWorkTypeId_fkey" FOREIGN KEY ("subWorkTypeId") REFERENCES "SubWorkType"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_leadSourceId_fkey" FOREIGN KEY ("leadSourceId") REFERENCES "LeadSource"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EnquiryStatusHistory" ADD CONSTRAINT "EnquiryStatusHistory_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EnquiryStatusHistory" ADD CONSTRAINT "EnquiryStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
