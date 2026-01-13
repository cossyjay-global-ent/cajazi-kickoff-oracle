import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SUPPORT_EMAIL = "support@cosmas.dev";

const emailProviders = [
  { name: "Gmail", url: `https://mail.google.com/mail/?view=cm&to=${SUPPORT_EMAIL}` },
  { name: "Yahoo Mail", url: `https://compose.mail.yahoo.com/?to=${SUPPORT_EMAIL}` },
  { name: "Outlook", url: `https://outlook.live.com/mail/0/deeplink/compose?to=${SUPPORT_EMAIL}` },
  { name: "Default Mail App", url: `mailto:${SUPPORT_EMAIL}` },
];

const Contact = () => {
  const handleEmailClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                  <Mail className="h-5 w-5" />
                  <span>Email: {SUPPORT_EMAIL}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {emailProviders.map((provider) => (
                    <DropdownMenuItem
                      key={provider.name}
                      onClick={() => handleEmailClick(provider.url)}
                      className="cursor-pointer"
                    >
                      {provider.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
