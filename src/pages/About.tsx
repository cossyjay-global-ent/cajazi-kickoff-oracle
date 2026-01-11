import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, Shield } from "lucide-react";

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* About Section */}
        <Card id="about">
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

        {/* Contact Section */}
        <Card id="contact">
          <CardHeader>
            <CardTitle className="text-2xl">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If you need support, have inquiries, or wish to contact us, please use the details below:
            </p>
            <div className="space-y-3">
              <a 
                href="mailto:support@cosmas.dev"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Mail className="h-5 w-5" />
                <span>Email: support@cosmas.dev</span>
              </a>
              <a 
                href="https://wa.me/447350005190" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Phone className="h-5 w-5" />
                <span>WhatsApp (Support Only): +44 7350 005190</span>
              </a>
            </div>
            <p className="text-sm text-muted-foreground italic">
              WhatsApp is strictly for customer support only.
            </p>
          </CardContent>
        </Card>

        {/* Privacy Section */}
        <Card id="privacy">
          <CardHeader>
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
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

        {/* Terms Section */}
        <Card id="terms">
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
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

        {/* Responsible Gaming Section */}
        <Card id="responsible-gaming">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6" />
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

export default About;
