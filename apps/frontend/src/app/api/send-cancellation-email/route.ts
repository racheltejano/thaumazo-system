import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, trackingId, contactPerson, reason } = await request.json()

    // Replace this with your actual email service (SendGrid, Resend, etc.)
    // Example using a generic email service:
    
    const emailBody = `
      Dear ${contactPerson},

      We regret to inform you that your order (Tracking ID: ${trackingId}) has been cancelled by our administration team.

      Cancellation Reason: ${reason}

      If you have any questions or concerns, please don't hesitate to contact us.

      Thank you for your understanding.

      Best regards,
      TEXTS Delivery Team
    `

    // TODO: Implement your email sending logic here
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'noreply@yourdomain.com',
    //   to: email,
    //   subject: `Order ${trackingId} Cancelled`,
    //   text: emailBody,
    // })

    console.log('Cancellation email would be sent to:', email)
    console.log('Email body:', emailBody)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending cancellation email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}