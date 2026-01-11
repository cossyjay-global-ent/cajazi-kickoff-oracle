import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              By accessing or using KickoffPrediction, you agree to comply with these Terms of Service.
            </p>
            <p className="text-muted-foreground">
              All football predictions and sports insights provided on this website are for
              informational purposes only. We do not guarantee match outcomes, and no content
              should be considered financial or betting advice.
            </p>
            <p className="text-muted-foreground">
              Users are solely responsible for how they use the information provided on this platform.
              KickoffPrediction shall not be held liable for any losses incurred.
            </p>
            <p className="text-muted-foreground">
              We reserve the right to modify, update, or discontinue any part of the website or services
              at any time without prior notice.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
