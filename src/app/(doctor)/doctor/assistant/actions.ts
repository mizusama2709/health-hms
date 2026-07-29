"use server";

import { requireRole } from "@/lib/authz";
import { answerClinicalQuery } from "@/lib/ai/client";

export async function askInziDoctorAction(question: string, history: string): Promise<string> {
  await requireRole("DOCTOR");
  return answerClinicalQuery(question, "DOCTOR", history);
}
