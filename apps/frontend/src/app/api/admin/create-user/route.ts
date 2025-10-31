// apps/frontend/src/app/api/admin/create-user/route.ts
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Function to generate a random temporary password
function generateTemporaryPassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(req: Request) {
  try {
    const { email, role, adminUserId } = await req.json()

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing email or role' }), 
        { status: 400 }
      )
    }

    // 🧪 TESTING MODE: Override email recipient for testing
    const testEmailOverride = process.env.TEST_EMAIL_OVERRIDE
    const emailRecipient = testEmailOverride || email

    console.log('📧 Email config:', {
      originalEmail: email,
      willSendTo: emailRecipient,
      testMode: !!testEmailOverride
    })

    // Verify the requesting user is an admin
    if (adminUserId) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', adminUserId)
        .single()

      if (adminProfile?.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }), 
          { status: 403 }
        )
      }
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword()

    // Create user with admin API (bypasses email verification)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        created_by_admin: true
      }
    })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError?.message || 'Failed to create user' }), 
        { status: 500 }
      )
    }

    // ✨ NEW: Create profile with profile completion flags
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: email,
        role: role,
        created_by_admin: true,        // ← Mark as admin-created
        profile_completed: false,      // ← Needs profile setup
        temp_password_changed: false   // ← Needs password change
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile' }), 
        { status: 500 }
      )
    }

    // Send welcome email with credentials
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    const { error: emailError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: emailRecipient,
      subject: 'Welcome to Thaumazo Logistics - Your Account Credentials',
      reply_to: emailRecipient,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 650px; margin: auto; line-height: 1.6;">
          ${testEmailOverride ? `
          <div style="background: #fff3cd; border: 2px solid #ffc107; color: #856404; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <strong>🧪 TEST MODE</strong><br/>
            <span style="font-size: 14px;">This email was sent to you for testing. Original recipient: <strong>${email}</strong></span>
          </div>
          ` : ''}
          <div style="background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">🚚 Thaumazo EXpress Transport Solutions</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Welcome to Our Team!</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0; font-size: 16px;">Hello,</p>

            <p>Your account has been created by the administrator. Welcome to <strong>Thaumazo Logistics</strong>!</p>

            <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0 0 10px 0; color: #e65100; font-weight: 600;">⚠️ Important: First-Time Setup Required</p>
              <p style="margin: 0; color: #666; font-size: 14px;">After your first login, you'll be asked to change your password and complete your profile before accessing the system.</p>
            </div>

            <div style="background: #f8f9fa; border: 2px solid #ef6c00; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Login Credentials</p>
              
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #888; text-transform: uppercase;">Email</p>
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #2c3e50; font-family: 'Courier New', monospace;">
                  ${email}
                </p>
              </div>

              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #888; text-transform: uppercase;">Temporary Password</p>
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ef6c00; font-family: 'Courier New', monospace;">
                  ${temporaryPassword}
                </p>
              </div>

              <div>
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #888; text-transform: uppercase;">Role</p>
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #2c3e50; text-transform: capitalize;">
                  ${role.replace('_', ' ')}
                </p>
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" 
                 style="display: inline-block; background: linear-gradient(135deg, #ef6c00 0%, #ff8f00 100%); color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(239, 108, 0, 0.3);">
                Log In Now →
              </a>
            </div>

            <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; color: #1565c0; font-size: 14px;">
                <strong>🔒 Security Reminder:</strong> Never share your password with anyone. Our team will never ask for your password via email or phone.
              </p>
            </div>

            <p>If you have any questions or need assistance, please don't hesitate to contact your administrator or our support team.</p>

            <div style="border-top: 2px solid #ef6c00; padding-top: 20px; margin-top: 30px;">
              <p style="margin: 0; font-weight: 600;">Best regards,</p>
              <p style="margin: 5px 0 0 0; color: #ef6c00; font-weight: 600;">The Thaumazo Logistics Team</p>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
              This is an automated message from Thaumazo Logistics.<br/>
              If you did not expect this email, please contact your administrator immediately.
            </p>
          </div>
        </div>
      `,
    })

    if (emailError) {
      console.error('Email send failed:', emailError)
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: newUser.user.id,
          warning: 'User created but email failed to send',
          emailError: emailError.message || 'Unknown email error'
        }), 
        { status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        message: 'User created and email sent successfully'
      }), 
      { status: 200 }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Unexpected error occurred' }), 
      { status: 500 }
    )
  }
}