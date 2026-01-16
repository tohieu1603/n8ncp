import nodemailer from 'nodemailer'
import { logger } from '../utils/logger'

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || 'ImageGen AI <noreply@imagegen.ai>'

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
})

// Generate 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send verification email
export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<boolean> {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      logger.warn('SMTP not configured, skipping email send', { email })
      // In development, log the code instead
      logger.info('Verification code (dev mode)', { email, code })
      return true
    }

    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Xác thực tài khoản ImageGen AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Xác thực Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">ImageGen AI</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Xác thực tài khoản của bạn</h2>
                      <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                        Cảm ơn bạn đã đăng ký tài khoản ImageGen AI. Vui lòng sử dụng mã xác thực bên dưới để hoàn tất đăng ký:
                      </p>

                      <!-- Verification Code -->
                      <div style="text-align: center; margin: 30px 0;">
                        <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
                          <span style="font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 8px;">${code}</span>
                        </div>
                      </div>

                      <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                        ⏰ Mã xác thực có hiệu lực trong <strong>15 phút</strong>.
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.6;">
                        Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        © 2024 ImageGen AI. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Mã xác thực ImageGen AI của bạn là: ${code}\n\nMã có hiệu lực trong 15 phút.\n\nNếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.`,
    }

    await transporter.sendMail(mailOptions)
    logger.info('Verification email sent', { email })
    return true
  } catch (error) {
    logger.error('Failed to send verification email', error as Error)
    return false
  }
}
