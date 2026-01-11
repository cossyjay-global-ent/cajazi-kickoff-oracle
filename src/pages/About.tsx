import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">About KickoffPrediction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              KickoffPrediction is a football analytics and prediction platform built to provide
              accurate match insights, statistics, and premium VIP predictions. Our goal is to
              deliver reliable, data-driven information that helps users make informed decisions.
            </p>
            <p className="text-muted-foreground">
              We are committed to transparency, user trust, and continuous improvement of our services.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;
