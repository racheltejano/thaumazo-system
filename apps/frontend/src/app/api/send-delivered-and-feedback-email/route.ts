import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, trackingId, contactPerson } = await req.json()

    if (!email || !trackingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const recipientEmail = process.env.TEST_EMAIL_OVERRIDE || email
    const trackingUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/track/${trackingId}`
    const feedbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/feedback/${trackingId}`

    const testModeNotice = process.env.TEST_EMAIL_OVERRIDE ? `
      <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin: 0 0 20px 0; border-radius: 6px;">
        <p style="margin: 0; color: #856404; font-size: 13px;">
          ⚠️ <strong>TEST MODE:</strong> This email was intended for <strong>${email}</strong>
        </p>
      </div>
    ` : ''

    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `✅ Delivery Complete - ${trackingId} | We'd Love Your Feedback!`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Delivery Complete!</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
          </div>
          
          <!-- Content -->
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;">
            ${testModeNotice}

            <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

            <p>Great news! Your order has been <strong>successfully delivered</strong>. We hope everything arrived in perfect condition!</p>

            <!-- Tracking Box -->
            <div style="background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Completed Order - Tracking ID</p>
              <p style="margin: 0; font-size: 22px; font-weight: bold; color: #10b981; font-family: 'Courier New', monospace;">
                ${trackingId}
              </p>
            </div>

            <!-- Success Message -->
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px;">
                <strong>✅ Delivery Status</strong><br/>
                Your items have been delivered successfully. Thank you for trusting Thaumazo Logistics with your delivery needs!
              </p>
            </div>

            <!-- Feedback Section - HIGHLIGHTED -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); border-radius: 8px; padding: 25px; margin: 30px 0; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
              <div style="text-align: center; color: white;">
                <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">⭐ How Was Your Experience?</h3>
                <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.95;">
                  Your feedback helps us improve our service and serve you better!
                </p>
                <a href="${feedbackUrl}" style="display: inline-block; background: white; color: #f59e0b; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
                  ⭐ Share Your Feedback
                </a>
              </div>
            </div>

            <!-- Additional Info -->
            <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #1565c0; font-size: 14px;">
                <strong>📋 Order Details</strong><br/>
                You can view your complete order details and delivery history anytime by clicking the button below.
              </p>
            </div>

            <!-- Track Order Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(239, 108, 0, 0.3);">
                📦 View Order Details
              </a>
            </div>

            <p>Thank you for choosing Thaumazo Logistics! We look forward to serving you again.</p>

            <!-- Signature -->
            <div style="border-top: 2px solid #ef6c00; padding-top: 20px; margin-top: 30px;">
              <p style="margin: 0; font-weight: 600;">Best regards,</p>
              <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
              This is an automated notification from Thaumazo Logistics.<br/>
              Questions about your delivery? Reply to this email or contact our support team.<br/>
              <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">View order: ${trackingId}</a>
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Delivered & feedback email failed:', error)
      return NextResponse.json({ error: 'Email failed to send' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}