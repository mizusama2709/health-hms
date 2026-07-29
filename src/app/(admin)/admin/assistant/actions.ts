"use server";

import { requireRole } from "@/lib/authz";
import { answerClinicalQuery } from "@/lib/ai/client";

export async function askInziStaffAction(question: string, history: string): Promise<string> {
  await requireRole("ADMIN_RECEPTION", "SUPER_ADMIN", "NURSE", "RECEPTIONIST", "LAB", "PHARMACIST");
  return answerClinicalQuery(question, "STAFF", history);
}
