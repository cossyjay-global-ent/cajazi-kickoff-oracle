import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

const ResponsibleGaming = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Responsible Gaming (18+)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              KickoffPrediction is intended for users aged 18 years and above.
            </p>
            <p className="text-muted-foreground">
              We promote responsible gaming and do not encourage excessive or irresponsible betting.
              If you feel that gambling is becoming a problem, please seek help from a professional
              support organization.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResponsibleGaming;
