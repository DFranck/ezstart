import type { LocaleDict } from './en.js'

export const vi: LocaleDict = {
  passwordReset: {
    subject: 'Đặt lại mật khẩu {appName} của bạn',
    heading: 'Đặt lại mật khẩu {appName}',
    intro: 'Nhấn vào nút bên dưới để đặt lại mật khẩu của bạn:',
    ctaLabel: 'Đặt lại mật khẩu',
    outro: 'Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.',
  },
  emailVerification: {
    subject: 'Xác minh địa chỉ email {appName} của bạn',
    heading: 'Xác minh email {appName}',
    intro: 'Nhấn vào nút bên dưới để xác minh địa chỉ email của bạn:',
    ctaLabel: 'Xác minh email',
    outro: 'Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.',
  },
  welcomeSetPassword: {
    subject: 'Chào mừng bạn đến với {appName}',
    heading: 'Chào mừng {username} đến với {appName}!',
    intro:
      'Tài khoản của bạn đã được tạo. Để bảo mật tài khoản, vui lòng đặt mật khẩu bằng nút bên dưới:',
    ctaLabel: 'Đặt mật khẩu của tôi',
    outro:
      'Bạn cũng có thể đăng nhập mà không cần mật khẩu ngay bây giờ, nhưng chúng tôi khuyên bạn nên đặt một mật khẩu. Liên kết này sẽ hết hạn sau 24 giờ.',
    promoMessage: '🎁 Mã ưu đãi {promoCode} đã được áp dụng vào tài khoản của bạn!',
  },
  accountDeletion: {
    subject: 'Tài khoản {appName} của bạn được lên lịch xóa',
    heading: 'Đã lên lịch xóa tài khoản',
    intro:
      'Chào {username}, chúng tôi đã nhận được yêu cầu xóa tài khoản {appName} ({email}) của bạn.',
    schedule: 'Tài khoản của bạn sẽ bị xóa vĩnh viễn vào {date} (sau {gracePeriodDays} ngày).',
    grace:
      'Nếu bạn đổi ý trong khoảng thời gian này, chỉ cần đăng nhập lại và tài khoản của bạn sẽ được khôi phục.',
    ifNotYou:
      'Nếu bạn không yêu cầu điều này, vui lòng liên hệ ngay với bộ phận hỗ trợ của chúng tôi.',
    signature: '— Đội ngũ {appName}',
  },
  common: {
    footerRights: '© {year} {appName}. Bảo lưu mọi quyền.',
    footerNoreply: 'Đây là email tự động — vui lòng không trả lời.',
  },
} as const
