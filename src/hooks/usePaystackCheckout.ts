import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PAYSTACK_PUBLIC_KEY = "pk_live_917f97fe3a9db32a1f6c2340c5e30e34f50d6a48";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // in NGN
  duration: string;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  { id: "2_weeks", name: "2 Weeks", price: 4500, duration: "2 weeks" },
  { id: "1_month", name: "Monthly", price: 8500, duration: "1 month" },
  { id: "6_months", name: "6 Months", price: 35000, duration: "6 months" },
  { id: "1_year", name: "1 Year", price: 55000, duration: "1 year" },
];

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => { openIframe: () => void };
    };
  }
}

interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  metadata: {
    plan_id: string;
    plan_name: string;
    custom_fields: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  callback: (response: PaystackResponse) => void;
  onClose: () => void;
}

interface PaystackResponse {
  reference: string;
  status: string;
  trans: string;
  transaction: string;
  trxref: string;
}

export const usePaystackCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Paystack script
  useEffect(() => {
    const existingScript = document.getElementById("paystack-script");
    if (existingScript) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-script";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Paystack script");
      toast.error("Failed to load payment system. Please refresh the page.");
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on cleanup as it may be needed
    };
  }, []);

  const generateReference = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `CAJ_${timestamp}_${random}`;
  }, []);

  const initiatePayment = useCallback(
    async (plan: SubscriptionPlan, userEmail?: string) => {
      if (!isScriptLoaded) {
        toast.error("Payment system is loading. Please try again.");
        return;
      }

      if (!window.PaystackPop) {
        toast.error("Payment system not available. Please refresh the page.");
        return;
      }

      // Get user email from auth if not provided
      let email = userEmail;
      if (!email) {
        const { data: { session } } = await supabase.auth.getSession();
        email = session?.user?.email;
      }

      if (!email) {
        toast.error("Please log in to subscribe to a plan.");
        return;
      }

      setIsLoading(true);
      const reference = generateReference();

      try {
        const config: PaystackConfig = {
          key: PAYSTACK_PUBLIC_KEY,
          email: email,
          amount: plan.price * 100, // Convert to kobo
          currency: "NGN",
          ref: reference,
          metadata: {
            plan_id: plan.id,
            plan_name: plan.name,
            custom_fields: [
              {
                display_name: "Plan",
                variable_name: "plan",
                value: plan.name,
              },
              {
                display_name: "Duration",
                variable_name: "duration",
                value: plan.duration,
              },
            ],
          },
          callback: function(response: PaystackResponse) {
            console.log("Payment successful:", response);
            toast.success(
              "Payment successful! Your subscription will be activated shortly."
            );
            setIsLoading(false);
            
            // The webhook will handle subscription activation
            setTimeout(function() {
              window.location.reload();
            }, 2000);
          },
          onClose: function() {
            console.log("Payment popup closed");
            toast.info("Payment cancelled. You can try again anytime.");
            setIsLoading(false);
          },
        };

        const handler = window.PaystackPop.setup(config);
        handler.openIframe();
      } catch (error) {
        console.error("Payment initialization error:", error);
        toast.error("Failed to initialize payment. Please try again.");
        setIsLoading(false);
      }
    },
    [isScriptLoaded, generateReference]
  );

  return {
    initiatePayment,
    isLoading,
    isScriptLoaded,
    plans: subscriptionPlans,
  };
};
