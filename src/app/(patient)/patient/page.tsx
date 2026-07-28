import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PatientHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Patient dashboard</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Booking a doctor, viewing follow-ups, and your visit history will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
