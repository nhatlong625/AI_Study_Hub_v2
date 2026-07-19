package com.aistudyhub.service;
public interface EmailService {
    void sendVerificationEmail(String to, String fullName, String token, String shortCode);
    void sendPasswordResetEmail(String to, String fullName, String token);
    void sendShareNotificationEmail(String to, String recipientName, String senderName, String documentTitle, String permission);
}
