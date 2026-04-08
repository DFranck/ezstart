export function passwordResetTemplate(resetUrl: string, appName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your ${appName} password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Reset Password</a>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">If you didn't request this, ignore this email.</p>
    </div>
  `
}

export function emailVerificationTemplate(verifyUrl: string, appName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify your ${appName} email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Verify Email</a>
    </div>
  `
}

export function welcomeSetPasswordTemplate(
  setPasswordUrl: string,
  appName: string,
  username: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to ${appName}, ${username}!</h2>
      <p>Your account has been created. To secure it, please set up a password:</p>
      <a href="${setPasswordUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Set My Password</a>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">You can also log in without a password for now, but we recommend setting one for security.</p>
      <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
    </div>
  `
}

export function invoiceSentTemplate(
  invoiceUrl: string,
  clientName: string,
  amount: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Invoice</h2>
      <p>Hi ${clientName},</p>
      <p>A new invoice for ${amount} has been sent to you.</p>
      <a href="${invoiceUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Invoice</a>
    </div>
  `
}
