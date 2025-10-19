/**
 * 📧 sendClientEmail (POST)
 *
 * Sends a “Choose how to proceed” email WITHOUT generating a tracking ID yet.
 * Generates a unique token saved in `pending_client_emails`.
 *
 * 🧭 Endpoint: `/api/send-tracking-email`
 *
 * 📨 Request Body:
 * ```json
 * {
 *   "email": "client@example.com"
 * }
 * ```
 *
 * ⚙️ Functionality:
 * - Validates that `email` is provided.
 * - Creates a one-time token stored in `pending_client_emails`.
 * - Sends a beautifully formatted Thaumazo email (same format as before).
 * - Email includes:
 *    1. “Create One-Time Order” → `/api/client/generate-tracking-id?token=XYZ`
 *    2. “Create Account & Order” → `/client/register`
 * - Token expires in 1 hour.
 *
 * 🔐 Environment Variables:
 * - `RESEND_API_KEY` (for email sending)
 *
 * 🧱 Response Codes:
 * - 200 → Email sent successfully
 * - 400 → Missing email
 * - 500 → Server or email error
 */

import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return new Response(JSON.stringify({ error: 'Missing client email' }), { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    // ✅ Generate token & save to database
    const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // expires in 1 hour

    const { error: insertError } = await supabase.from('pending_client_emails').insert({
      email,
      token,
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 })
    }

    // ✅ Build URLs for email
    const oneTimeOrderUrl = `http://localhost:3000/api/client/generate-tracking-id?token=${token}`
    const registerUrl = `http://localhost:3000/client/register`

    // ✅ Send the email
    const { error: sendError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Choose How to Proceed – Thaumazo Logistics',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">🚚 Thaumazo Logistics</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Professional Transport & Delivery Services</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0; font-size: 16px;">Dear Valued Client,</p>

            <p>Thank you for choosing <strong>Thaumazo Logistics</strong> as your trusted delivery partner. We appreciate your business and are committed to providing you with exceptional service.</p>

            <p>Before we proceed with your delivery request, please select how you’d like to continue:</p>

            <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 20px 0;">
              <div style="margin-bottom: 25px;">
                <h3 style="color: #ef6c00; margin: 0 0 10px 0; font-size: 18px;">Option 1: One-Time Order</h3>
                <p style="margin: 0 0 15px 0; color: #555;">Perfect for single deliveries without account registration. Quick and convenient for immediate shipping needs.</p>
                <div style="text-align: center;">
                  <a href="${oneTimeOrderUrl}" 
                     style="display: inline-block; background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(239, 108, 0, 0.3);">
                    Create One-Time Order →
                  </a>
                </div>
              </div>

              <hr style="border: none; height: 1px; background: #dee2e6; margin: 25px 0;">

              <div>
                <h3 style="color: #2196F3; margin: 0 0 10px 0; font-size: 18px;">Option 2: Create Account</h3>
                <p style="margin: 0 0 15px 0; color: #555;">Ideal for regular customers. Save your delivery history, manage multiple orders, and enjoy streamlined future bookings.</p>
                <div style="text-align: center;">
                  <a href="${registerUrl}" 
                     style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);">
                    Create Account & Order →
                  </a>
                </div>
              </div>
            </div>

            <div style="background: #fff8e1; border-left: 4px solid #ef6c00; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #795548; font-size: 14px;">
                <strong>⏳ Note:</strong> The One-Time Order link will expire in 1 hour for your security.
              </p>
            </div>

            <p>Should you require any assistance, please reply to this email or contact our support team. We look forward to serving you!</p>

            <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
              <p style="margin: 0; font-weight: 600;">Best regards,</p>
              <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
              This is an automated message from Thaumazo Logistics. Please do not reply directly.<br/>
              If you did not request this email, you may safely ignore it.
            </p>
          </div>
        </div>
      `,
    })

    if (sendError) {
      console.error('Email send failed:', sendError)
      return new Response(JSON.stringify({ error: 'Email failed to send' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 })
  }
}
