import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, trackingId, contactPerson, reason, cancellationType } = await req.json()

    if (!email || !trackingId) {
      return NextResponse.json({ error: 'Missing email or trackingId' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Use test email override if in test mode
    const recipientEmail = process.env.TEST_EMAIL_OVERRIDE || email

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const trackingUrl = `${baseUrl}/track/${trackingId}`
    
    // FIXED: Use trackingId in the URL path
    const rescheduleUrl = `${baseUrl}/reschedule/${trackingId}`

    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `Order Cancellation - Tracking ID: ${trackingId}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;">
          ${process.env.TEST_EMAIL_OVERRIDE ? `
          <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin: 0 0 20px 0; border-radius: 6px;">
            <p style="margin: 0; color: #856404; font-size: 13px;">
              ⚠️ <strong>TEST MODE:</strong> This email was intended for <strong>${email}</strong>
            </p>
          </div>
          ` : ''}

          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">❌ Order Cancellation Notice</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

            <p>We regret to inform you that your order has been cancelled by our dispatch team.</p>

            <div style="background: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Cancelled Order - Tracking ID</p>
              <p style="margin: 0; font-size: 22px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace;">
                ${trackingId}
              </p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>📝 Cancellation Reason:</strong><br/>
                ${reason}
              </p>
            </div>

            <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #1565c0; font-size: 14px;">
                <strong>💡 Want to Reschedule?</strong><br/>
                We understand that plans change. If you'd like to reschedule your delivery, please click the button below or contact our support team.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${rescheduleUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(239, 108, 0, 0.3);">
                📅 Reschedule This Order
              </a>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #888;">
                Or view your order details below
              </p>
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${trackingUrl}" 
                 style="display: inline-block; background: #f3f4f6; color: #374151; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; border: 1px solid #d1d5db;">
                📋 View Order Details
              </a>
            </div>

            <hr style="border: none; height: 1px; background: #dee2e6; margin: 30px 0;">

            <p>If you have any questions or concerns about this cancellation, please reply to this email or contact our support team directly.</p>

            <p style="margin-bottom: 30px;">We apologize for any inconvenience this may have caused and look forward to serving you in the future.</p>

            <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
              <p style="margin: 0; font-weight: 600;">Best regards,</p>
              <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
              This is an automated notification from Thaumazo Logistics.<br/>
              For support, please reply to this email or contact us directly.<br/>
              <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">View order: ${trackingId}</a>
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Cancellation email failed:', error)
      return NextResponse.json({ error: 'Email failed to send' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}