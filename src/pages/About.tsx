import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail } from "lucide-react";

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* About Section */}
        <Card id="about">
          <CardHeader>
            <CardTitle className="text-3xl">Cajazi Prediction</CardTitle>
            <CardDescription className="text-lg">
              Your trusted platform for insightful forecasts, strategic guidance, and responsible prediction services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We provide accurate, data-driven insights to help you make informed decisions while ensuring fairness, 
              integrity, and transparency in all our activities.
            </p>
            <p className="text-muted-foreground">
              At Cajazi Prediction, we are dedicated to offering reliable and well-researched predictions across various fields. 
              Our goal is to empower users with valuable insights that promote informed choices and responsible participation.
            </p>
            <p className="text-muted-foreground">
              We uphold professionalism, accuracy, and user satisfaction as our core principles.
            </p>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card id="contact">
          <CardHeader>
            <CardTitle className="text-2xl">Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We value your feedback and inquiries. For support, partnership opportunities, or general questions, 
              please reach out to us via:
            </p>
            <div className="space-y-3">
              <a 
                href="https://wa.me/447350005190" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Phone className="h-5 w-5" />
                <span>WhatsApp: +44 7350 005190</span>
              </a>
              <a 
                href="mailto:info@cajaziprediction.com"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Mail className="h-5 w-5" />
                <span>Email: info@cajaziprediction.com</span>
              </a>
            </div>
            <p className="text-muted-foreground">
              Our support team is available to assist you with any questions or concerns.
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
              Your privacy is important to us. At Cajazi Prediction, we ensure that all user data and personal information 
              are handled with the highest level of security and confidentiality. We do not share or sell user data to 
              third parties without consent.
            </p>
            <p className="text-muted-foreground">
              By using our services, you agree to our data collection and usage practices as described in this policy.
            </p>
            <p className="text-muted-foreground font-semibold">
              You must be 18 years or older to use our services. We do not knowingly collect personal information from 
              individuals under 18.
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
              By accessing and using Cajazi Prediction, you agree to comply with our terms and conditions. Users are 
              expected to engage responsibly and respectfully within our platform.
            </p>
            <p className="text-muted-foreground">
              We reserve the right to modify or update these terms at any time, and continued use of our services 
              indicates acceptance of such changes.
            </p>
            <p className="text-muted-foreground">
              We promote responsible usage and encourage all users to make informed, ethical, and lawful decisions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;