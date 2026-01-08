import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

// Plan duration mapping (in days)
const PLAN_DURATIONS: Record<string, number> = {
  '2_weeks': 14,
  '1_month': 30,
  '6_months': 180,
  '1_year': 365,
  'yearly': 365,
  // Paystack plan codes - map to durations
  'PLN_2weeks': 14,
  'PLN_1month': 30,
  'PLN_6months': 180,
  'PLN_yearly': 365,
}

// Price to plan mapping (in NGN kobo - Paystack sends amount in kobo)
const PRICE_TO_PLAN: Record<string, string> = {
  '4500': '2_weeks',    // ₦4,500
  '8500': '1_month',    // ₦8,500
  '35000': '6_months',  // ₦35,000
  '55000': '1_year',    // ₦55,000
  // Legacy USD prices (in cents)
  '299': '2_weeks',
  '599': '1_month', 
  '1999': '6_months',
  '3099': '1_year',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    // Verify Paystack signature
    if (signature) {
      const crypto = await import("https://deno.land/std@0.168.0/crypto/mod.ts")
      const encoder = new TextEncoder()
      const key = await crypto.crypto.subtle.importKey(
        "raw",
        encoder.encode(PAYSTACK_SECRET_KEY),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      )
      const signatureBytes = await crypto.crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(body)
      )
      const computedSignature = Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      if (computedSignature !== signature) {
        console.error('Invalid signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const payload = JSON.parse(body)
    console.log('Paystack webhook received:', payload.event)

    // Handle successful payment
    if (payload.event === 'charge.success') {
      const data = payload.data
      const customerEmail = data.customer?.email?.toLowerCase()
      const amountInNaira = Math.round(data.amount / 100).toString() // Convert from kobo to naira
      const reference = data.reference
      // Check for plan_id in metadata first (from inline popup), then fallback to plan code
      const planIdFromMetadata = data.metadata?.plan_id
      const planCode = data.plan?.plan_code || data.metadata?.plan_type

      console.log('Processing payment for:', customerEmail, 'Amount (NGN):', amountInNaira, 'Reference:', reference, 'Plan ID:', planIdFromMetadata)

      if (!customerEmail) {
        console.error('No customer email in payment data')
        return new Response(
          JSON.stringify({ error: 'No customer email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Determine plan type: 1) from metadata plan_id, 2) from amount, 3) from plan code
      let planType = planIdFromMetadata || PRICE_TO_PLAN[amountInNaira] || planCode || '1_month'
      
      // Clean up plan type
      if (planType.startsWith('PLN_')) {
        planType = planType.replace('PLN_', '')
      }

      const durationDays = PLAN_DURATIONS[planType] || 30
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + durationDays)

      // Check if user exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', customerEmail)
        .maybeSingle()

      console.log('Existing profile:', existingProfile)

      // Check for existing subscription with this reference to prevent duplicates
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('payment_email', customerEmail)
        .eq('plan_type', planType)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle()

      if (existingSub) {
        console.log('Active subscription already exists for this email and plan')
        return new Response(
          JSON.stringify({ message: 'Subscription already active' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create subscription record
      const subscriptionData: any = {
        payment_email: customerEmail,
        plan_type: planType,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        registration_status: existingProfile ? 'registered' : 'pending',
      }

      // If user exists, link subscription immediately
      if (existingProfile) {
        subscriptionData.user_id = existingProfile.id
      }

      const { data: newSub, error: subError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single()

      if (subError) {
        console.error('Error creating subscription:', subError)
        return new Response(
          JSON.stringify({ error: 'Failed to create subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Subscription created successfully:', newSub.id, 'for', customerEmail)

      // Send confirmation notification if user exists
      if (existingProfile) {
        await supabase.from('notifications').insert({
          user_id: existingProfile.id,
          type: 'subscription_activated',
          title: 'VIP Subscription Activated!',
          message: `Your ${planType.replace('_', ' ')} VIP subscription is now active until ${expiresAt.toLocaleDateString()}.`,
        })
      }

      // Send activation email
      try {
        const emailPayload = {
          type: 'subscription_activated',
          recipient_email: customerEmail,
          plan_type: planType,
          expires_at: expiresAt.toISOString(),
        }
        
        await fetch(`${SUPABASE_URL}/functions/v1/send-subscription-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        })
        console.log('Activation email sent to:', customerEmail)
      } catch (emailError) {
        console.error('Failed to send activation email:', emailError)
        // Don't fail the webhook for email errors
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: existingProfile 
            ? 'Subscription activated for registered user' 
            : 'Subscription created - will be linked when user registers',
          subscription_id: newSub.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle subscription cancellation
    if (payload.event === 'subscription.disable' || payload.event === 'subscription.not_renew') {
      const customerEmail = payload.data?.customer?.email?.toLowerCase()
      
      if (customerEmail) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('payment_email', customerEmail)
          .eq('status', 'active')

        if (error) {
          console.error('Error cancelling subscription:', error)
        } else {
          console.log('Subscription cancelled for:', customerEmail)
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
