import { InziChat } from "@/components/inzi/inzi-chat";
import { askInziStaffAction } from "./actions";

export default function AssistantPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">InZi Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Ask about using the system or day-to-day operational questions.
        </p>
      </div>
      <InziChat askAction={askInziStaffAction} title="Ask InZi" placeholder="Ask a question…" />
    </div>
  );
}
