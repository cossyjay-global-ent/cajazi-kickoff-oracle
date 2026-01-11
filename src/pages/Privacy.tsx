import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              KickoffPrediction respects your privacy and is committed to protecting your personal data.
              We collect only the information necessary to operate our services, improve user experience,
              and ensure platform security.
            </p>
            <p className="text-muted-foreground">
              Your personal information is never sold or shared with third parties except where required
              by law or to support essential service functionality.
            </p>
            <p className="text-muted-foreground">
              By using this website, you agree to the collection and use of information in accordance
              with this Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
