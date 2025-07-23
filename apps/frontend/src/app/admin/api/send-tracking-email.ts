// pages/api/send-tracking-email.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, trackingId } = req.body

    // Validate input
    if (!email || !trackingId) {
      return res.status(400).json({ error: 'Email and tracking ID are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Check if Resend API key is available
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not found in environment variables')
      return res.status(500).json({ error: 'Email service not configured' })
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Change this to your verified domain
      to: email,
      subject: `Your Tracking ID: ${trackingId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Tracking ID</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 24px; text-align: center;">
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        📦 Your Tracking ID
                    </h1>
                    <p style="color: #fed7aa; margin: 8px 0 0 0; font-size: 16px;">
                        Track your order with the ID below
                    </p>
                </div>
                
                <!-- Content -->
                <div style="padding: 32px 24px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
                            Your tracking ID has been generated successfully:
                        </p>
                        
                        <!-- Tracking ID Box -->
                        <div style="background-color: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; margin: 24px 0; display: inline-block;">
                            <code style="font-family: 'Monaco', 'Menlo', monospace; font-size: 24px; font-weight: 700; color: #1f2937; letter-spacing: 2px;">
                                ${trackingId}
                            </code>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0 0;">
                            💡 Save this ID to track your order status
                        </p>
                    </div>
                    
                    <!-- Instructions -->
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 24px 0;">
                        <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                            📋 Next Steps:
                        </h3>
                        <ul style="color: #1e40af; font-size: 14px; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 4px;">Keep this tracking ID safe</li>
                            <li style="margin-bottom: 4px;">Use it to check your order status</li>
                            <li style="margin-bottom: 4px;">Contact us if you need assistance</li>
                        </ul>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/track/${trackingId}" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            Track Your Order
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
                        This email was sent automatically. Please do not reply to this email.
                    </p>
                    <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                        © ${new Date().getFullYear()} Your Company Name. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
Your Tracking ID: ${trackingId}

Hi there!

Your tracking ID has been generated successfully. Please save this ID to track your order:

Tracking ID: ${trackingId}

Next Steps:
- Keep this tracking ID safe
- Use it to check your order status  
- Contact us if you need assistance

Track your order: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/track/${trackingId}

Thank you for your business!

---
This email was sent automatically. Please do not reply to this email.
© ${new Date().getFullYear()} Your Company Name. All rights reserved.
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return res.status(500).json({ error: error.message || 'Failed to send email' })
    }

    console.log('Email sent successfully:', data)

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      emailId: data?.id
    })

  } catch (error: any) {
    console.error('API route error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    })
  }
}