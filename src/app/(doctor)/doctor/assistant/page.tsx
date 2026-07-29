import { InziChat } from "@/components/inzi/inzi-chat";
import { askInziDoctorAction } from "./actions";

export default function DoctorAssistantPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">InZi Assistant</h1>
        <p className="text-sm text-muted-foreground">Ask clinical or operational questions.</p>
      </div>
      <InziChat askAction={askInziDoctorAction} title="Ask InZi" placeholder="Ask a clinical question…" />
    </div>
  );
}
