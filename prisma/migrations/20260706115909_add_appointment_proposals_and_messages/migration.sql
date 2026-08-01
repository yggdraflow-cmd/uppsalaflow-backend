-- CreateEnum
CREATE TYPE "AppointmentProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AppointmentMessageSender" AS ENUM ('OWNER', 'CLIENT');

-- CreateTable
CREATE TABLE "appointment_proposals" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "suggestedDate" TIMESTAMP(3) NOT NULL,
    "suggestedStartTime" TEXT NOT NULL,
    "suggestedEndTime" TEXT NOT NULL,
    "message" TEXT,
    "status" "AppointmentProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_messages" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "sender" "AppointmentMessageSender" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_proposals_appointmentId_idx" ON "appointment_proposals"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_messages_appointmentId_idx" ON "appointment_messages"("appointmentId");

-- AddForeignKey
ALTER TABLE "appointment_proposals" ADD CONSTRAINT "appointment_proposals_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_messages" ADD CONSTRAINT "appointment_messages_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
