import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { 
      email, 
      trackingId, 
      contactPerson, 
      pickupDate,
      pickupTime
    } = await req.json()

    if (!email || !trackingId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Use test email override if in test mode
    const recipientEmail = process.env.TEST_EMAIL_OVERRIDE || email

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const rescheduleUrl = `${baseUrl}/reschedule/${trackingId}`
    const trackingUrl = `${baseUrl}/track/${trackingId}`
    
    // Format date nicely
    const formattedDate = new Date(pickupDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `Reschedule Request - No Available Drivers | Tracking ID: ${trackingId}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;">
          ${process.env.TEST_EMAIL_OVERRIDE ? `
          <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin: 0 0 20px 0; border-radius: 6px;">
            <p style="margin: 0; color: #856404; font-size: 13px;">
              ⚠️ <strong>TEST MODE:</strong> This email was intended for <strong>${email}</strong>
            </p>
          </div>
          ` : ''}

          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">📅 Reschedule Request</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

            <p>We're reaching out regarding your upcoming delivery order.</p>

            <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Tracking ID</p>
              <p style="margin: 0 0 20px 0; font-size: 22px; font-weight: bold; color: #d97706; font-family: 'Courier New', monospace;">
                ${trackingId}
              </p>
              
              <div style="background: white; border-radius: 6px; padding: 15px; margin-top: 15px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: 500;">📆 Current Pickup Schedule</p>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #92400e;">
                  ${formattedDate}
                </p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #92400e;">
                  🕐 ${pickupTime}
                </p>
              </div>
            </div>

            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                <strong>⚠️ Driver Availability Issue:</strong><br/>
                Unfortunately, we don't have any available drivers for your currently scheduled pickup date and time. All our drivers are fully booked for this time slot.
              </p>
            </div>

            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>💡 What You Can Do:</strong><br/>
                To ensure your delivery is completed, we kindly ask you to reschedule your order to a different date or time when we have drivers available.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${rescheduleUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                📅 Reschedule My Order Now
              </a>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #888;">
                Click the button above to choose a new date and time
              </p>
            </div>


            <hr style="border: none; height: 1px; background: #dee2e6; margin: 30px 0;">

            <p>We sincerely apologize for any inconvenience this may cause. We're working hard to serve all our customers and appreciate your flexibility.</p>

            <p style="margin-bottom: 30px;">If you have any questions or concerns, please don't hesitate to reply to this email or contact our support team.</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${trackingUrl}" 
                 style="display: inline-block; background: #f3f4f6; color: #374151; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; border: 1px solid #d1d5db;">
                📦 View Order Details
              </a>
            </div>

            <div style="border-top: 2px solid #f97316; padding-top: 20px;">
              <p style="margin: 0; font-weight: 600;">Best regards,</p>
              <p style="margin: 5px 0 0 0; color: #f97316; font-weight: 600;">The Thaumazo Logistics Team</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
              This is an automated notification from Thaumazo Logistics.<br/>
              For support, please reply to this email or contact us directly.<br/>
              <a href="${trackingUrl}" style="color: #f97316; text-decoration: none;">View order: ${trackingId}</a>
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Reschedule request email failed:', error)
      return NextResponse.json({ error: 'Email failed to send' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}