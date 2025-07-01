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
      subject: 'Your Delivery Tracking ID from Thaumazo Logistics',
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
          <h2 style="color: #E2725B;">🚚 Thaumazo Logistics</h2>
          <p>Dear Valued Client,</p>

          <p>Thank you for choosing <strong>Thaumazo Logistics</strong> for your delivery needs.</p>

          <p>We're excited to help you get started! Below is your unique tracking ID:</p>

          <p style="font-size: 18px; font-weight: bold; background: #f4f4f4; padding: 10px; border-radius: 6px; text-align: center;">
            ${trackingId}
          </p>

          <p>To proceed with your delivery request, please click the link below to complete your order details:</p>

          <p style="text-align: center; margin: 20px 0;">
            <a href="https://yourdomain.com/create-order/${trackingId}" 
               style="background-color: #E2725B; color: white; padding: 12px 20px; border-radius: 6px; text-decoration: none;">
              Complete My Order
            </a>
          </p>

          <p>If you have any questions or need assistance, feel free to reply to this email.</p>

          <p>Warm regards,<br/>
          <strong>Thaumazo Logistics Team</strong></p>

          <hr style="margin-top: 30px;" />
          <p style="font-size: 12px; color: #888;">
            This email was sent automatically. If you did not request this, please ignore it.
          </p>
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
