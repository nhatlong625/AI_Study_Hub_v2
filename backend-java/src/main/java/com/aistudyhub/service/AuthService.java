package com.aistudyhub.service;
import com.aistudyhub.dto.request.*;
import com.aistudyhub.dto.response.*;
import jakarta.servlet.http.HttpServletRequest;
public interface AuthService {
    MessageResponse register(RegisterRequest request);
    MessageResponse verifyEmail(String token);
    AuthResponse login(LoginRequest request, HttpServletRequest httpRequest);
    MessageResponse forgotPassword(ForgotPasswordRequest request);
    MessageResponse resetPassword(ResetPasswordRequest request);
    AuthResponse googleLogin(GoogleLoginRequest request);
}
