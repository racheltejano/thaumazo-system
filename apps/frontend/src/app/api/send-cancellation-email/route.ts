import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, trackingId, contactPerson, reason, cancellationType } = await req.json()

    if (!email || !trackingId || !cancellationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const recipientEmail = process.env.TEST_EMAIL_OVERRIDE || email
    const trackingUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/track/${trackingId}`

    // Generate email content based on cancellation type
    const emailContent = getEmailContent(cancellationType, reason, contactPerson, trackingId, trackingUrl, email)

    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
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

function getEmailContent(
  cancellationType: string,
  reason: string,
  contactPerson: string,
  trackingId: string,
  trackingUrl: string,
  originalEmail: string
) {
  const testModeNotice = process.env.TEST_EMAIL_OVERRIDE ? `
    <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin: 0 0 20px 0; border-radius: 6px;">
      <p style="margin: 0; color: #856404; font-size: 13px;">
        ⚠️ <strong>TEST MODE:</strong> This email was intended for <strong>${originalEmail}</strong>
      </p>
    </div>
  ` : ''

  const baseStyles = {
    container: "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;",
    content: "background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;",
    trackingBox: "background: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;",
    button: "display: inline-block; background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(239, 108, 0, 0.3);",
    footer: "background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;"
  }

  switch (cancellationType) {
    case 'no_drivers_available':
      return {
        subject: `Important: Order ${trackingId} - Driver Availability Issue`,
        html: `
          <div style="${baseStyles.container}">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">🚛 Driver Availability Notice</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
            </div>
            
            <div style="${baseStyles.content}">
              ${testModeNotice}

              <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

              <p>We regret to inform you that we are unable to fulfill your delivery order at this time due to <strong>driver availability constraints</strong>.</p>

              <div style="${baseStyles.trackingBox}">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Cancelled Order - Tracking ID</p>
                <p style="margin: 0; font-size: 22px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace;">
                  ${trackingId}
                </p>
              </div>

              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>📝 What happened?</strong><br/>
                  Unfortunately, all our drivers are fully booked for your requested pickup date and time. We sincerely apologize for this inconvenience.
                </p>
              </div>

              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #1565c0; font-size: 14px;">
                  <strong>💡 What are your options?</strong><br/>
                  • <strong>Reschedule:</strong> Choose a different date/time when drivers are available<br/>
                  • <strong>Contact us:</strong> We can help find alternative delivery solutions<br/>
                  • <strong>Priority booking:</strong> Book earlier for better availability
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingUrl}" style="${baseStyles.button}">
                  📅 Reschedule Delivery
                </a>
              </div>

              <p>We understand how important timely delivery is to your business. Our team is ready to help you find the best alternative solution.</p>

              <p style="margin-bottom: 30px;">Please don't hesitate to reach out if you need assistance with rescheduling or have any questions.</p>

              <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
                <p style="margin: 0; font-weight: 600;">Sincerely,</p>
                <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
              </div>
            </div>

            <div style="${baseStyles.footer}">
              <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                This is an automated notification from Thaumazo Logistics.<br/>
                Need help? Reply to this email or contact us at support@thaumazo.com<br/>
                <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">View order: ${trackingId}</a>
              </p>
            </div>
          </div>
        `
      }

    case 'client_request':
      return {
        subject: `Order Cancellation Confirmed - ${trackingId}`,
        html: `
          <div style="${baseStyles.container}">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Cancellation Confirmed</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
            </div>
            
            <div style="${baseStyles.content}">
              ${testModeNotice}

              <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

              <p>This email confirms that your order has been <strong>successfully cancelled</strong> as per your request.</p>

              <div style="${baseStyles.trackingBox}">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Cancelled Order - Tracking ID</p>
                <p style="margin: 0; font-size: 22px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace;">
                  ${trackingId}
                </p>
              </div>

              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  <strong>✅ Status Update</strong><br/>
                  Your cancellation request has been processed. No charges will be applied to this order.
                </p>
              </div>

              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #1565c0; font-size: 14px;">
                  <strong>💡 Need delivery services in the future?</strong><br/>
                  We're here whenever you need us! Simply place a new order through our system or contact our team directly.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingUrl}" style="${baseStyles.button}">
                  📋 View Cancellation Details
                </a>
              </div>

              <p>Thank you for considering Thaumazo Logistics for your delivery needs. We hope to serve you again in the future!</p>

              <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
                <p style="margin: 0; font-weight: 600;">Best regards,</p>
                <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
              </div>
            </div>

            <div style="${baseStyles.footer}">
              <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                This is an automated notification from Thaumazo Logistics.<br/>
                Questions? Reply to this email or contact us directly.<br/>
                <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">View order: ${trackingId}</a>
              </p>
            </div>
          </div>
        `
      }

    case 'operational_issues':
      return {
        subject: `Important: Order ${trackingId} - Operational Issue`,
        html: `
          <div style="${baseStyles.container}">
            <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">⚠️ Operational Notice</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
            </div>
            
            <div style="${baseStyles.content}">
              ${testModeNotice}

              <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

              <p>We sincerely apologize, but we must cancel your order due to an <strong>unforeseen operational issue</strong> that has affected our ability to complete this delivery.</p>

              <div style="${baseStyles.trackingBox}">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Cancelled Order - Tracking ID</p>
                <p style="margin: 0; font-size: 22px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace;">
                  ${trackingId}
                </p>
              </div>

              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>📝 What happened?</strong><br/>
                  We encountered an operational issue that prevents us from fulfilling this order safely and on time. Your satisfaction and the safety of your items are our top priorities.
                </p>
              </div>

              <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  <strong>🙏 Our Sincere Apologies</strong><br/>
                  We understand this cancellation may cause inconvenience to your business operations. This is not the level of service we strive to provide.
                </p>
              </div>

              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #1565c0; font-size: 14px;">
                  <strong>💡 Next Steps</strong><br/>
                  • Our team will contact you within 24 hours to discuss alternatives<br/>
                  • We'll prioritize your next booking<br/>
                  • Special arrangements may be available to make up for this inconvenience
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingUrl}" style="${baseStyles.button}">
                  📞 Contact Support
                </a>
              </div>

              <p>We deeply value your business and are committed to making this right. Please contact us so we can discuss how to best serve your delivery needs.</p>

              <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
                <p style="margin: 0; font-weight: 600;">With sincere apologies,</p>
                <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
              </div>
            </div>

            <div style="${baseStyles.footer}">
              <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                This is an automated notification from Thaumazo Logistics.<br/>
                Priority support: Reply immediately or call our hotline<br/>
                <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">View order: ${trackingId}</a>
              </p>
            </div>
          </div>
        `
      }

    case 'custom':
      return {
        subject: `Order Cancellation Notice - ${trackingId}`,
        html: `
          <div style="${baseStyles.container}">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">❌ Order Cancellation Notice</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
            </div>
            
            <div style="${baseStyles.content}">
              ${testModeNotice}

              <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

              <p>We regret to inform you that your order has been cancelled.</p>

              <div style="${baseStyles.trackingBox}">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Cancelled Order - Tracking ID</p>
                <p style="margin: 0; font-size: 22px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace;">
                  ${trackingId}
                </p>
              </div>

              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>📝 Cancellation Reason:</strong><br/>
                  ${reason || 'Please contact our support team for more details.'}
                </p>
              </div>

              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #1565c0; font-size: 14px;">
                  <strong>💡 Need Assistance?</strong><br/>
                  If you have any questions about this cancellation or need to reschedule your delivery, please don't hesitate to contact our support team.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingUrl}" style="${baseStyles.button}">
                  📋 View Order Details
                </a>
              </div>

              <p>We apologize for any inconvenience this may have caused. Our team is available to help you with any questions or to arrange alternative delivery options.</p>

              <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
                <p style="margin: 0; font-weight: 600;">Best regards,</p>
                <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
              </div>
            </div>

            <div style="${baseStyles.footer}">
              <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                This is an automated notification from Thaumazo Logistics.<br/>
                For support, please reply to this email or contact us directly.<br/>
                <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">View order: ${trackingId}</a>
              </p>
            </div>
          </div>
        `
      }

    case 'past_date_unassigned':
      return {
        subject: `Order Auto-Cancelled - ${trackingId} (Pickup Date Passed)`,
        html: `
          <div style="${baseStyles.container}">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">⏰ Order Auto-Cancelled</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
            </div>
            
            <div style="${baseStyles.content}">
              ${testModeNotice}

              <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

              <p>Your order has been automatically cancelled because the scheduled pickup date has passed and we were unable to assign a driver.</p>

              <div style="${baseStyles.trackingBox}">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Auto-Cancelled Order - Tracking ID</p>
                <p style="margin: 0; font-size: 22px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace;">
                  ${trackingId}
                </p>
              </div>

              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>📝 What happened?</strong><br/>
                  Unfortunately, your scheduled pickup date has passed and we were unable to assign a driver to your order due to driver availability constraints.
                </p>
              </div>

              <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  <strong>🙏 Our Apologies</strong><br/>
                  We sincerely apologize for not being able to accommodate your delivery. We understand this may have caused inconvenience to your business.
                </p>
              </div>

              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #1565c0; font-size: 14px;">
                  <strong>💡 Need to Reschedule?</strong><br/>
                  • Place a new order with your preferred delivery date<br/>
                  • Book earlier for better driver availability<br/>
                  • Contact our team for priority scheduling assistance
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/place-order" style="${baseStyles.button}">
                  📦 Place New Order
                </a>
              </div>

              <p>We hope to have the opportunity to serve you in the future. Please don't hesitate to contact us if you need any assistance with a new booking.</p>

              <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
                <p style="margin: 0; font-weight: 600;">Sincerely,</p>
                <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
              </div>
            </div>

            <div style="${baseStyles.footer}">
              <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                This is an automated notification from Thaumazo Logistics.<br/>
                Need help? Reply to this email or contact support@thaumazo.com<br/>
                <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">View order: ${trackingId}</a>
              </p>
            </div>
          </div>
        `
      }

    default:
      return {
        subject: `Order Cancellation - ${trackingId}`,
        html: `
          <div style="${baseStyles.container}">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">❌ Order Cancellation Notice</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Thaumazo Logistics</p>
            </div>
            
            <div style="${baseStyles.content}">
              ${testModeNotice}

              <p style="margin-top: 0; font-size: 16px;">Dear ${contactPerson || 'Valued Customer'},</p>

              <p>Your order has been cancelled.</p>

              <div style="${baseStyles.trackingBox}">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Cancelled Order - Tracking ID</p>
                <p style="margin: 0; font-size: 22px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace;">
                  ${trackingId}
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingUrl}" style="${baseStyles.button}">
                  📋 View Order Details
                </a>
              </div>

              <p>If you have any questions, please contact our support team.</p>

              <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
                <p style="margin: 0; font-weight: 600;">Best regards,</p>
                <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
              </div>
            </div>

            <div style="${baseStyles.footer}">
              <p style="margin: 0; font-size: 12px; color: #888;">
                <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">View order: ${trackingId}</a>
              </p>
            </div>
          </div>
        `
      }
  }
}