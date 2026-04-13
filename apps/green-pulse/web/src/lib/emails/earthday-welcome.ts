import type { EmailOverrideRequest } from '@ezstart/auth-sdk'

// Earth Day Vietnam 2026 — bilingual (VI + EN) welcome email.
// NOTE: `bodyHtml` override is rendered verbatim by `welcomeSetPasswordTemplate`
// (no `{username}`/`{{name}}` interpolation on the override path), so we use
// a generic greeting instead of a placeholder.
const EARTHDAY_CHAT_URL =
  'https://www.ai-greenpulse.com/chat?utm_source=email&utm_medium=welcome&utm_campaign=earthday2026'

export const earthdayEmailOverride: EmailOverrideRequest = {
  subject: '✅ Đăng ký thành công — Welcome to GreenPulse.AI',
  from: 'noreply@ai-greenpulse.com',
  replyTo: 'aseradni@nexora-venture.com',
  bodyHtml: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: var(--foreground, #111);">
      <p style="font-size: 15px; line-height: 1.6;">Xin chào,</p>
      <p style="font-size: 15px; line-height: 1.6;">Cảm ơn bạn đã đăng ký GreenPulse.AI tại sự kiện Earth Day Vietnam 2026! 🌱</p>
      <p style="font-size: 15px; line-height: 1.6;">Bạn có thể bắt đầu ngay bằng cách trò chuyện với Agent AI của chúng tôi (hoàn toàn miễn phí). GP.A sẽ giúp bạn:</p>
      <ul style="font-size: 15px; line-height: 1.6; padding-left: 20px;">
        <li>Đánh giá chi phí năng lượng và giúp bạn giảm hóa đơn điện</li>
        <li>Phát hiện tác động tiêu cực của doanh nghiệp và đề xuất cải thiện ngay</li>
        <li>Tư vấn dễ áp dụng để bắt đầu tạo tác động tích cực</li>
        <li>Giải thích dễ hiểu về ESG, chuẩn quốc tế, và các quy định mới của Việt Nam</li>
      </ul>
      <p style="margin: 20px 0;"><a href="${EARTHDAY_CHAT_URL}" style="display: inline-block; background: var(--primary, #0070f3); color: var(--primary-foreground, #ffffff); padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">👉 Bắt đầu ngay</a></p>
      <div style="padding: 12px 16px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 6px; margin: 16px 0; font-size: 14px;">
        <strong>Mã ưu đãi của bạn: EARTHDAY2026</strong><br>
        → 1 tháng miễn phí gói Pro khi ra mắt. Mã đã được lưu trong tài khoản của bạn.
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Nếu bạn có câu hỏi, hãy liên hệ trực tiếp với tôi.</p>
      <p style="font-size: 15px; line-height: 1.6;">Trân trọng,<br><strong>Amber Seradni</strong><br>CEO &amp; Đồng sáng lập, GreenPulse.AI<br><a href="mailto:aseradni@nexora-venture.com" style="color: var(--primary, #0070f3);">aseradni@nexora-venture.com</a></p>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">

      <p style="font-size: 15px; line-height: 1.6;">Hi,</p>
      <p style="font-size: 15px; line-height: 1.6;">Thank you for registering with GreenPulse.AI at Earth Day Vietnam 2026! 🌱</p>
      <p style="font-size: 15px; line-height: 1.6;">You can start right away by chatting with our AI Agent (completely free). GP.A will help you:</p>
      <ul style="font-size: 15px; line-height: 1.6; padding-left: 20px;">
        <li>Assess your energy costs and help you reduce electricity bills</li>
        <li>Identify your business negative impacts and suggest quick improvements</li>
        <li>Provide easy-to-apply advice to start building a positive impact</li>
        <li>Explain ESG, international standards, and Vietnam's new regulations in simple terms</li>
      </ul>
      <p style="margin: 20px 0;"><a href="${EARTHDAY_CHAT_URL}" style="display: inline-block; background: var(--primary, #0070f3); color: var(--primary-foreground, #ffffff); padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">👉 Start now</a></p>
      <div style="padding: 12px 16px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 6px; margin: 16px 0; font-size: 14px;">
        <strong>Your promo code: EARTHDAY2026</strong><br>
        → 1 free month of Pro when it launches. The code has been saved to your account.
      </div>
      <p style="font-size: 15px; line-height: 1.6;">If you have any questions, feel free to reach out directly.</p>
      <p style="font-size: 15px; line-height: 1.6;">Best regards,<br><strong>Amber Seradni</strong><br>CEO &amp; Co-founder, GreenPulse.AI<br><a href="mailto:aseradni@nexora-venture.com" style="color: var(--primary, #0070f3);">aseradni@nexora-venture.com</a></p>
    </div>
  `,
}
