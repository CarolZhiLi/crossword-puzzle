import os
import smtplib
import ssl


class EmailService:
    def __init__(self):
        self.host = os.getenv('SMTP_HOST')
        self.port = int(os.getenv('SMTP_PORT', '587'))
        self.user = os.getenv('SMTP_USER')
        self.password = os.getenv('SMTP_PASSWORD')
        self.from_addr = os.getenv('SMTP_FROM', self.user or '')
        self.use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        self.use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'
        # Prevent long hangs on outbound SMTP in production (which can yield 502 at the proxy)
        # Can be overridden via env: SMTP_TIMEOUT (seconds)
        try:
            self.timeout = float(os.getenv('SMTP_TIMEOUT', '10'))
        except Exception:
            self.timeout = 10.0
        self.app_name = os.getenv('APP_NAME', 'CrossyThink')

    def _compose(self, to_email: str, reset_link: str) -> bytes:
        subject = f"{self.app_name} Password Reset"
        body = (
            f"You requested a password reset for your {self.app_name} account.\n\n"
            f"Click the link below to reset your password (valid for a limited time):\n"
            f"{reset_link}\n\n"
            f"If you did not request this, please ignore this email."
        )
        msg = (
            f"From: {self.from_addr}\r\n"
            f"To: {to_email}\r\n"
            f"Subject: {subject}\r\n"
            f"MIME-Version: 1.0\r\n"
            f"Content-Type: text/plain; charset=utf-8\r\n\r\n"
            f"{body}"
        )
        return msg.encode('utf-8')

    def send_reset_email(self, to_email: str, reset_link: str) -> bool:
        if not self.host or not (self.user and self.password):
            return False
        payload = self._compose(to_email, reset_link)
        try:
            if self.use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=self.timeout) as server:
                    server.login(self.user, self.password)
                    server.sendmail(self.from_addr, [to_email], payload)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as server:
                    if self.use_tls:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                    server.login(self.user, self.password)
                    server.sendmail(self.from_addr, [to_email], payload)
            return True
        except Exception as e:
            print(f"[Password Reset] Failed to send email to {to_email}: {e}")
            return False
