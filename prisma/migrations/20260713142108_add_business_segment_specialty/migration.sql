-- CreateEnum
CREATE TYPE "BusinessSegment" AS ENUM ('BARBERSHOP', 'BEAUTY', 'ODONTOLOGY', 'VETERINARY', 'WELLNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessSpecialty" AS ENUM ('BEAUTY_GENERAL', 'HAIR', 'NAILS', 'LASHES', 'MAKEUP', 'SKINCARE', 'EYEBROWS');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "segment" "BusinessSegment",
ADD COLUMN     "specialty" "BusinessSpecialty";
