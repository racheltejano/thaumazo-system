import { Resend } from 'resend'

export async function POST(req: Request) {
  const { email, trackingId } = await req.json()

  if (!email || !trackingId) {
    return new Response(JSON.stringify({ error: 'Missing email or trackingId' }), { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Your Delivery Tracking ID - Thaumazo Logistics',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">🚚 Thaumazo EXpress Transport Solutions</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Professional Logistics & Delivery Services</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0; font-size: 16px;">Dear Valued Client,</p>

            <p>Thank you for choosing <strong>Thaumazo Logistics</strong> as your trusted delivery partner. We appreciate your business and are committed to providing you with exceptional service.</p>

            <p>Your delivery request has been successfully initiated. Please find your unique tracking identification number below:</p>

            <div style="background: #f8f9fa; border: 2px solid #ef6c00; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Tracking ID</p>
              <p style="margin: 0; font-size: 20px; font-weight: bold; color: #ef6c00; font-family: 'Courier New', monospace;">
                ${trackingId}
              </p>
            </div>

            <p style="font-size: 16px; margin-bottom: 25px;">To complete your delivery request, please select the option that best suits your needs:</p>

            <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 20px 0;">
              <div style="margin-bottom: 25px;">
                <h3 style="color: #ef6c00; margin: 0 0 10px 0; font-size: 18px;">Option 1: One-Time Order</h3>
                <p style="margin: 0 0 15px 0; color: #555;">Perfect for single deliveries without account registration. Quick and convenient for immediate shipping needs.</p>
                <div style="text-align: center;">
                  <a href="http://localhost:3000/track" 
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
                  <a href="http://localhost:3000/client/register" 
                     style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);">
                    Create Account & Order →
                  </a>
                </div>
              </div>
            </div>

            <div style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                <strong>💡 Tip:</strong> Creating an account allows you to track all your shipments in one place and provides faster checkout for future orders.
              </p>
            </div>

            <p>Should you require any assistance or have questions regarding your delivery, our customer support team is ready to help. Please don't hesitate to contact us by replying to this email or calling our support line.</p>

            <p style="margin-bottom: 30px;">We look forward to serving you and ensuring your package reaches its destination safely and on time.</p>

            <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
              <p style="margin: 0; font-weight: 600;">Best regards,</p>
              <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
              This is an automated message from Thaumazo Logistics. Please do not reply directly to this email address.<br/>
              If you did not request this tracking ID, please disregard this message.
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Email send failed:', error)
      return new Response(JSON.stringify({ error: 'Email failed to send' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }))
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 })
  }
}