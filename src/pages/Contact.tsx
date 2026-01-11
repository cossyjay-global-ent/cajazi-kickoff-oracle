import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail } from "lucide-react";

const Contact = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Contact</CardTitle>
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
      </div>
    </div>
  );
};

export default Contact;
