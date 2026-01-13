import { memo } from "react";
import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "447350005190";
const PREFILLED_MESSAGE = "Hello KickoffPrediction, I want VIP predictions and support.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILLED_MESSAGE)}`;

export const FloatingWhatsApp = memo(() => {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform will-change-transform hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" fill="white" />
    </a>
  );
});

FloatingWhatsApp.displayName = "FloatingWhatsApp";
