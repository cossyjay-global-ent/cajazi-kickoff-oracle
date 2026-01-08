import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Find subscriptions expiring in exactly 3 days
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const threeDaysStart = new Date(threeDaysFromNow)
    threeDaysStart.setHours(0, 0, 0, 0)
    const threeDaysEnd = new Date(threeDaysFromNow)
    threeDaysEnd.setHours(23, 59, 59, 999)

    const { data: expiringSubscriptions, error: expError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('expires_at', threeDaysStart.toISOString())
      .lte('expires_at', threeDaysEnd.toISOString())

    if (expError) {
      console.error('Error fetching expiring subscriptions:', expError)
      throw expError
    }

    console.log(`Found ${expiringSubscriptions?.length || 0} subscriptions expiring in 3 days`)

    let emailsSent = 0

    for (const sub of expiringSubscriptions || []) {
      const email = sub.payment_email || (sub.user_id ? await getEmailFromUserId(supabase, sub.user_id) : null)
      
      if (!email) continue

      try {
        // Send expiring notification email
        await fetch(`${SUPABASE_URL}/functions/v1/send-subscription-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: 'subscription_expiring',
            recipient_email: email,
            plan_type: sub.plan_type,
            expires_at: sub.expires_at,
            days_remaining: 3,
          }),
        })

        // Create in-app notification if user exists
        if (sub.user_id) {
          await supabase.from('notifications').insert({
            user_id: sub.user_id,
            type: 'subscription_expiring',
            title: 'Subscription Expiring Soon!',
            message: `Your VIP subscription will expire in 3 days. Renew now to continue enjoying premium predictions.`,
          })
        }

        emailsSent++
        console.log('Expiry warning sent to:', email)
      } catch (emailError) {
        console.error('Failed to send expiry email to:', email, emailError)
      }
    }

    // Find and update expired subscriptions
    const now = new Date().toISOString()
    const { data: expiredSubscriptions, error: updateError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', now)

    if (updateError) {
      console.error('Error fetching expired subscriptions:', updateError)
    } else if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      console.log(`Found ${expiredSubscriptions.length} expired subscriptions to update`)

      // Update status to expired
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('expires_at', now)

      // Send expired notifications
      for (const sub of expiredSubscriptions) {
        const email = sub.payment_email || (sub.user_id ? await getEmailFromUserId(supabase, sub.user_id) : null)
        
        if (email) {
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-subscription-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                type: 'subscription_expired',
                recipient_email: email,
                plan_type: sub.plan_type,
                expires_at: sub.expires_at,
              }),
            })
            console.log('Expiry notification sent to:', email)
          } catch (e) {
            console.error('Failed to send expiry notification:', e)
          }
        }

        if (sub.user_id) {
          await supabase.from('notifications').insert({
            user_id: sub.user_id,
            type: 'subscription_expired',
            title: 'Subscription Expired',
            message: `Your VIP subscription has expired. Renew to regain access to premium predictions.`,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiring_notifications_sent: emailsSent,
        expired_subscriptions_processed: expiredSubscriptions?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Subscription check error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getEmailFromUserId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()
  return data?.email || null
}
