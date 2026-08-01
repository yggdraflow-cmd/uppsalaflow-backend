import { BillingCycle } from "@prisma/client";
import { z } from "zod";

function optionalNullableString(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string" && !value.trim()) {
        return null;
      }

      return value;
    },
    z.string().trim().max(maxLength).nullable().optional()
  );
}

function optionalNullableUrl() {
  return z.preprocess(
    (value) => {
      if (typeof value === "string" && !value.trim()) {
        return null;
      }

      return value;
    },
    z
      .string()
      .trim()
      .url("Informe uma URL válida.")
      .max(2000)
      .nullable()
      .optional()
  );
}

export const billingCycleParamSchema =
  z.nativeEnum(BillingCycle);

export const updatePlatformPaymentOptionSchema = z.object({
  paymentLink: optionalNullableUrl(),
  pixCopyPaste: optionalNullableString(5000),
  pixQrCodeUrl: optionalNullableUrl(),
  instructions: optionalNullableString(1000),
  active: z.boolean().optional(),
});
