import { Resend } from 'resend'

export async function POST(req: Request) {
  const { 
    email, 
    trackingId, 
    orderDetails 
  } = await req.json()

  if (!email || !trackingId) {
    return new Response(JSON.stringify({ error: 'Missing email or trackingId' }), { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  // Format pickup date/time
  const pickupDateTime = orderDetails.pickupDate && orderDetails.pickupTime 
    ? `${orderDetails.pickupDate} at ${orderDetails.pickupTime}`
    : 'To be confirmed'

  // Format products list
  const productsList = orderDetails.products?.map((p: any, i: number) => 
    `<li style="margin: 5px 0; color: #555;">
      ${i + 1}. ${p.name} - Quantity: ${p.quantity}${p.weight ? ` (${p.weight}kg)` : ''}${p.isFragile ? ' ⚠️ Fragile' : ''}
    </li>`
  ).join('') || '<li style="color: #666;">No products listed</li>'

  // Format dropoffs list
  const dropoffsList = orderDetails.dropoffs?.map((d: any, i: number) => 
    `<li style="margin: 8px 0; color: #555;">
      <strong>Stop ${i + 1}:</strong> ${d.address}
      ${d.contact ? `<br/><span style="font-size: 13px; color: #666;">Contact: ${d.contact}</span>` : ''}
      ${d.phone ? `<br/><span style="font-size: 13px; color: #666;">Phone: ${d.phone}</span>` : ''}
    </li>`
  ).join('') || '<li style="color: #666;">No dropoffs listed</li>'

  const trackingUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/track/${trackingId}`

  try {
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: `Order Confirmation - Tracking ID: ${trackingId}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Order Confirmed - Thaumazo Logistics</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Your delivery is being processed</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0; font-size: 16px;">Dear ${orderDetails.contactPerson || 'Valued Customer'},</p>

            <p>Thank you for choosing <strong>Thaumazo Logistics</strong>! Your order has been successfully created and is now being processed.</p>

            <div style="background: #f8f9fa; border: 2px solid #ef6c00; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Tracking ID</p>
              <p style="margin: 0; font-size: 22px; font-weight: bold; color: #ef6c00; font-family: 'Courier New', monospace;">
                ${trackingId}
              </p>
            </div>

            <div style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                <strong>📍 Track Your Order:</strong> Click the button below to monitor your delivery status in real-time.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(239, 108, 0, 0.3);">
                🔍 Track Your Delivery
              </a>
            </div>

            <hr style="border: none; height: 1px; background: #dee2e6; margin: 30px 0;">

            <h3 style="color: #ef6c00; margin: 20px 0 15px 0; font-size: 18px;">📋 Order Summary</h3>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Contact Person</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #2c3e50;">${orderDetails.contactPerson || 'N/A'}</p>
              </div>

              ${orderDetails.businessName ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Business Name</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #2c3e50;">${orderDetails.businessName}</p>
              </div>
              ` : ''}

              <div style="margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Contact Number</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #2c3e50;">${orderDetails.contactNumber || 'N/A'}</p>
              </div>

              <div style="margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Pickup Address</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #2c3e50;">${orderDetails.pickupAddress || 'N/A'}</p>
              </div>

              <div style="margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Scheduled Pickup</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #2c3e50;">📅 ${pickupDateTime}</p>
              </div>

              <div style="margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Vehicle Type</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #2c3e50;">🚛 ${orderDetails.truckType || 'N/A'}</p>
              </div>

              ${orderDetails.estimatedCost ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Estimated Cost</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700; color: #ef6c00;">₱${orderDetails.estimatedCost.toFixed(2)}</p>
              </div>
              ` : ''}
            </div>

            <h3 style="color: #ef6c00; margin: 25px 0 15px 0; font-size: 18px;">📦 Products</h3>
            <ul style="list-style: none; padding: 0; margin: 10px 0;">
              ${productsList}
            </ul>

            <h3 style="color: #ef6c00; margin: 25px 0 15px 0; font-size: 18px;">📍 Delivery Stops</h3>
            <ol style="padding-left: 20px; margin: 10px 0;">
              ${dropoffsList}
            </ol>

            ${orderDetails.specialInstructions ? `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>📝 Special Instructions:</strong><br/>
                ${orderDetails.specialInstructions}
              </p>
            </div>
            ` : ''}

            <hr style="border: none; height: 1px; background: #dee2e6; margin: 30px 0;">

            <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #1565c0; font-size: 14px;">
                <strong>💡 What's Next?</strong><br/>
                Our team will review your order and contact you shortly to confirm the details. You can track your delivery status anytime using the link above.
              </p>
            </div>

            <p>If you have any questions or need to make changes to your order, please reply to this email or contact our support team.</p>

            <p style="margin-bottom: 30px;">Thank you for trusting Thaumazo Logistics with your delivery needs!</p>

            <div style="border-top: 2px solid #ef6c00; padding-top: 20px;">
              <p style="margin: 0; font-weight: 600;">Best regards,</p>
              <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Professional Transport & Logistics Solutions</p>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
              This is an automated confirmation from Thaumazo Logistics.<br/>
              For support, please reply to this email or contact us directly.<br/>
              <a href="${trackingUrl}" style="color: #ef6c00; text-decoration: none;">Track your order: ${trackingId}</a>
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Order confirmation email failed:', error)
      return new Response(JSON.stringify({ error: 'Email failed to send' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }))
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 })
  }
}