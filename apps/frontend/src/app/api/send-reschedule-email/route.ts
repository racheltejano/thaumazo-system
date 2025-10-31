import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, trackingId, contactPerson, pickupDate, pickupTime, reason } = await req.json()

    if (!email || !trackingId || !pickupDate || !pickupTime) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // In test mode, override recipient email
    const recipientEmail = process.env.TEST_EMAIL_OVERRIDE || email

    const trackingUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/track/${trackingId}`

    // Format date nicely
    const formattedDate = new Date(pickupDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Format time (convert 24h to 12h format)
    const [hours, minutes] = pickupTime.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    const formattedTime = `${hour12}:${minutes} ${ampm}`

    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `Order Rescheduled - Tracking ID: ${trackingId}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">📅 Order Rescheduled</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;">
            ${process.env.TEST_EMAIL_OVERRIDE ? `
            <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin: 0 0 20px 0; border-radius: 6px;">
              <p style="margin: 0; color: #856404; font-size: 13px;">
                ⚠️ <strong>TEST MODE:</strong> This email was intended for <strong>${email}</strong>
              </p>
            </div>
            ` : ''}

            <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

            <p>Great news! Your cancelled order has been successfully rescheduled and is now active again.</p>

            <div style="background: #dbeafe; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Tracking ID</p>
              <p style="margin: 0; font-size: 22px; font-weight: bold; color: #2563eb; font-family: 'Courier New', monospace;">
                ${trackingId}
              </p>
            </div>

            <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #059669; font-size: 18px;">📦 New Pickup Schedule</h3>
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 10px;">📅</span>
                  <div>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">Date</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #059669;">${formattedDate}</p>
                  </div>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 10px;">🕐</span>
                  <div>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">Time (Philippine Time)</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #059669;">${formattedTime}</p>
                  </div>
                </div>
              </div>
            </div>

            ${reason ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>📝 Reschedule Reason:</strong><br/>
                ${reason}
              </p>
            </div>
            ` : ''}

            <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #075985; font-size: 14px;">
                <strong>✅ What's Next?</strong><br/>
                Your order is now back in our system as "Order Placed" status. A driver will be assigned to your order soon. You can track your order status anytime using the link below.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);">
                📦 Track Your Order
              </a>
            </div>

            <hr style="border: none; height: 1px; background: #dee2e6; margin: 30px 0;">

            <p>If you have any questions or need to make additional changes, please reply to this email or contact our support team.</p>

            <p style="margin-bottom: 30px;">Thank you for choosing Thaumazo Logistics!</p>

            <div style="border-top: 2px solid #2563eb; padding-top: 20px;">
              <p style="margin: 0; font-weight: 600;">Best regards,</p>
              <p style="margin: 5px 0 0 0; color: #2563eb; font-weight: 600;">The Thaumazo Logistics Team</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
              This is an automated notification from Thaumazo Logistics.<br/>
              For support, please reply to this email or contact us directly.<br/>
              <a href="${trackingUrl}" style="color: #2563eb; text-decoration: none;">Track order: ${trackingId}</a>
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Reschedule email failed:', error)
      return NextResponse.json({ error: 'Email failed to send' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}