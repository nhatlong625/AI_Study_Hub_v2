package com.aistudyhub.service.impl;

import com.aistudyhub.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @Value("${app.email-verify-url}")
    private String verifyUrl;

    @Value("${app.password-reset-url}")
    private String resetUrl;

    @Override
    public void sendVerificationEmail(String to, String fullName, String token, String shortCode) {
        String link = verifyUrl + "?token=" + token;
        sendHtmlEmail(to, "Verify your email - AI Study Hub",
            """
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;
                        border: 1px solid #ddd; border-radius: 8px; padding: 24px;">
                <h2 style="color: #333;">Welcome to AI Study Hub, %s!</h2>
                <p style="color: #555;">Please verify your email address using one of the options below.</p>

                <div style="background: #f4f0fe; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0 0 8px; color: #555; font-size: 14px;">Your verification code</p>
                    <p style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4F46E5;">%s</p>
                    <p style="margin: 8px 0 0; color: #999; font-size: 12px;">Enter this code on the verification page</p>
                </div>

                <p style="color: #555; text-align: center;">Or click the button below to verify automatically:</p>
                <div style="text-align: center;">
                    <a href="%s"
                       style="display: inline-block; background: #4F46E5; color: white;
                              padding: 12px 32px; text-decoration: none; border-radius: 6px;
                              font-weight: bold; margin: 8px 0;">
                        Verify Email
                    </a>
                </div>
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    This code and link expire in 24 hours.<br>
                    If you did not create this account, please ignore this email.
                </p>
            </div>
            """.formatted(fullName, shortCode, link));
    }

    @Override
    public void sendPasswordResetEmail(String to, String fullName, String token) {
        String link = resetUrl + "?token=" + token;
        sendHtmlEmail(to, "Reset your password - AI Study Hub",
            """
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;
                        border: 1px solid #ddd; border-radius: 8px; padding: 24px;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p style="color: #555;">Hi %s, click the button below to reset your password.</p>
                <a href="%s"
                   style="display: inline-block; background: #F59E0B; color: white;
                          padding: 12px 32px; text-decoration: none; border-radius: 6px;
                          font-weight: bold; margin: 16px 0;">
                    Reset Password
                </a>
                <p style="color: #999; font-size: 12px;">
                    This link expires in 15 minutes.<br>
                    If you did not request this, please ignore this email.
                </p>
            </div>
            """.formatted(fullName, link));
    }


    @Override
    public void sendShareNotificationEmail(String to, String recipientName, String senderName, String documentTitle, String permission) {
        String permissionLabel = "EDIT".equalsIgnoreCase(permission) ? "Editor" : "Viewer";
        String permissionDesc = "EDIT".equalsIgnoreCase(permission)
                ? "You can view and toggle the visibility of this document."
                : "You can view this document.";
        sendHtmlEmail(to, senderName + " shared a document with you - AI Study Hub",
            """
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;
                        border: 1px solid #ddd; border-radius: 8px; padding: 24px;">
                <h2 style="color: #333;">Hi %s,</h2>
                <p style="color: #555;"><strong>%s</strong> has shared a document with you on AI Study Hub.</p>
                <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0; color: #333; font-weight: bold;">%s</p>
                    <p style="margin: 4px 0 0; color: #666; font-size: 14px;">
                        Your role: <strong>%s</strong> - %s
                    </p>
                </div>
                <p style="color: #555;">Log in to AI Study Hub and go to <strong>Shared with me</strong> to access this document.</p>
                <p style="color: #999; font-size: 12px;">If you did not expect this, please ignore this email.</p>
            </div>
            """.formatted(recipientName, senderName, documentTitle, permissionLabel, permissionDesc));
    }
    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = HTML
            mailSender.send(message);
            log.info("Email sent to {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
