package com.aistudyhub.service.impl;

import com.aistudyhub.dto.request.*;
import com.aistudyhub.dto.response.*;
import com.aistudyhub.entity.*;
import com.aistudyhub.exception.*;
import com.aistudyhub.repository.*;
import com.aistudyhub.security.JwtTokenProvider;
import com.aistudyhub.service.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final AuthTokenRepository authTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final JdbcTemplate jdbcTemplate;

    @Value("${google.client-id:}")
    private String googleClientId;

    @Value("${app.token.email-verification-minutes:1440}")
    private long emailVerificationMinutes;

    @Value("${app.token.password-reset-minutes:15}")
    private long passwordResetMinutes;

    @Value("${jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    @Override
    @Transactional
    public MessageResponse register(RegisterRequest request) {
        Optional<User> existingOpt = userRepository.findByEmail(request.getEmail());
        User user;
        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getIsVerified())) {
                throw new BadRequestException("Email already exists");
            }
            existing.setFullName(request.getFullName());
            existing.setPassword(passwordEncoder.encode(request.getPassword()));
            existing.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(existing);
            authTokenRepository.invalidateTokensByUserAndType(user, TokenType.EMAIL_VERIFY);
        } else {
            Integer studentRoleId = resolveStudentRoleId();
            user = User.builder()
                    .fullName(request.getFullName())
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .roleId(studentRoleId)
                    .status("Active")
                    .build();
            user = userRepository.save(user);
        }

        // Give every newly registered user the default Basic subscription (idempotent),
        // matching the Google sign-up flow. Without this, email/password users have no
        // USER_SUBSCRIPTION row and fall back to hard-coded storage/quiz defaults.
        insertBasicSubscription(user.getUserId());

        String shortCode = generateShortCode();
        String uuid = UUID.randomUUID().toString();
        String tokenValue = shortCode + "-" + uuid;

        authTokenRepository.save(AuthToken.builder()
                .user(user)
                .token(tokenValue)
                .tokenType(TokenType.EMAIL_VERIFY)
                .expiresAt(LocalDateTime.now().plusMinutes(emailVerificationMinutes))
                .isUsed(false)
                .build());

        try { emailService.sendVerificationEmail(user.getEmail(), user.getFullName(), tokenValue, shortCode); }
        catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", user.getEmail(), e.getMessage());
            throw new BadRequestException("Could not send verification email, please try again.");
        }

        return MessageResponse.ok("Registration successful. Please check your email to verify your account.");
    }

    @Override
    @Transactional
    public MessageResponse verifyEmail(String token) {
        AuthToken authToken;
        if (token.matches("\\d{6}")) {
            // User nhập mã 6 số từ email → tìm record có token bắt đầu bằng SHORTCODE-
            authToken = authTokenRepository.findFirstByTokenStartingWithAndTokenTypeAndIsUsedFalse(
                    token + "-", TokenType.EMAIL_VERIFY)
                    .orElseThrow(() -> new BadRequestException("Invalid verification code"));
        } else {
            authToken = authTokenRepository.findByToken(token)
                    .orElseThrow(() -> new BadRequestException("Invalid token"));
            if (authToken.getIsUsed()) throw new BadRequestException("Token already used");
            if (authToken.getTokenType() != TokenType.EMAIL_VERIFY) throw new BadRequestException("Invalid token type");
        }
        
        if (authToken.getExpiresAt().isBefore(LocalDateTime.now())) throw new TokenExpiredException("Token expired");

        authToken.setIsUsed(true);
        authToken.setUsedAt(LocalDateTime.now());
        authTokenRepository.save(authToken);

        User user = authToken.getUser();
        user.setIsVerified(true);
        user.setVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        return MessageResponse.ok("Email verified successfully.");
    }

    @Override
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword()))
            throw new BadRequestException("Invalid email or password");

        boolean isAdmin = user.getRoleId() != null && user.getRoleId() == User.ROLE_ADMIN_ID;
        if (!isAdmin && !Boolean.TRUE.equals(user.getIsVerified())) {
            throw new BadRequestException("Email not verified. Please verify your email first.");
        }

        String roleName = resolveRoleName(user.getRoleId());
        String planName = resolvePlanName(user.getUserId());
        String jwt = jwtTokenProvider.generateToken(user, user.getUserId());

        // Lưu login session vào TOKEN table
        try {
            String ip = extractIp(httpRequest);
            String device = extractDevice(httpRequest);
            authTokenRepository.save(AuthToken.builder()
                    .user(user)
                    .token(jwt)
                    .tokenType(TokenType.LOGIN_SESSION)
                    .expiresAt(LocalDateTime.now().plus(Duration.ofMillis(jwtExpirationMs)))
                    .isUsed(false)
                    .deviceInfo(device)
                    .ipAddress(ip)
                    .lastUsedAt(LocalDateTime.now())
                    .build());
        } catch (Exception ignored) {}

        // Cập nhật login streak
        int streakDays = updateLoginStreak(user.getUserId());

        return AuthResponse.builder()
                .token(jwt)
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(roleName)
                .plan(planName)
                .streakDays(streakDays)
                .build();
    }

    @Override
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            authTokenRepository.invalidateTokensByUserAndType(user, TokenType.PASSWORD_RESET);
            String tokenValue = UUID.randomUUID().toString();
            authTokenRepository.save(AuthToken.builder()
                    .user(user).token(tokenValue)
                    .tokenType(TokenType.PASSWORD_RESET)
                    .expiresAt(LocalDateTime.now().plusMinutes(passwordResetMinutes))
                    .isUsed(false).build());
            try { emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), tokenValue); }
            catch (Exception ignored) {}
        });
        return MessageResponse.ok("If the email exists, a reset link has been sent.");
    }

    @Override
    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        AuthToken authToken = getToken(request.getToken(), TokenType.PASSWORD_RESET);
        User user = authToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        authToken.setIsUsed(true);
        authTokenRepository.save(authToken);
        return MessageResponse.ok("Password reset successfully.");
    }

    @Override
    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        Map<String, Object> body;
        try {
            RestTemplate restTemplate = new RestTemplate();
            String googleUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.getCredential();
            ResponseEntity<Map> response = restTemplate.getForEntity(googleUrl, Map.class);
            if (response.getStatusCode().isError() || response.getBody() == null) {
                throw new BadRequestException("Google token verification failed");
            }
            body = response.getBody();
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error verifying Google ID token: {}", e.getMessage());
            throw new BadRequestException("Google authentication failed: " + e.getMessage());
        }

        if (googleClientId != null && !googleClientId.isBlank()) {
            String aud = (String) body.get("aud");
            if (!googleClientId.equals(aud)) {
                log.error("Google token audience mismatch: expected={}, actual={}", googleClientId, aud);
                throw new BadRequestException("Google ID token audience mismatch");
            }
        }

        String email = (String) body.get("email");
        String name  = (String) body.get("name");
        String picture = (String) body.get("picture");
        if (email == null) throw new BadRequestException("Email not provided by Google");

        boolean isNewUser = false;
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            isNewUser = true;
            Integer studentRoleId = resolveStudentRoleId();
            user = User.builder()
                    .fullName(name != null ? name : email.split("@")[0])
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .roleId(studentRoleId)
                    .avatarUrl(picture)
                    .status("Active")
                    .isVerified(true)
                    .verifiedAt(LocalDateTime.now())
                    .build();
        } else {
            if (!Boolean.TRUE.equals(user.getIsVerified())) {
                user.setIsVerified(true);
                user.setVerifiedAt(LocalDateTime.now());
            }
            if (user.getAvatarUrl() == null && picture != null) {
                user.setAvatarUrl(picture);
            }
        }
        user.setLastLogin(LocalDateTime.now());
        user = userRepository.save(user);

        // Insert Basic subscription cho user Google mới
        if (isNewUser) {
            insertBasicSubscription(user.getUserId());
        }

        String roleName = resolveRoleName(user.getRoleId());
        String planName = resolvePlanName(user.getUserId());
        String jwt = jwtTokenProvider.generateToken(user, user.getUserId());
        int streakDays = updateLoginStreak(user.getUserId());

        return AuthResponse.builder()
                .token(jwt)
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(roleName)
                .plan(planName)
                .streakDays(streakDays)
                .build();
    }

    // ── Insert Basic Subscription ─────────────────────────────────────────────

    private void insertBasicSubscription(Integer userId) {
        try {
            // Idempotent: only create the default Basic subscription if the user has none yet,
            // so it is safe to call from both email/password registration and Google sign-up.
            jdbcTemplate.update("""
                    INSERT INTO dbo.USER_SUBSCRIPTION (user_id, plan_id, version_id, start_date, end_date, status, renewal_policy)
                    SELECT ?, sp.plan_id, pv.version_id,
                           CAST(GETDATE() AS DATE),
                           DATEADD(month, pv.duration_month, CAST(GETDATE() AS DATE)),
                           'Active', 'KEEP_VERSION'
                    FROM dbo.SUBSCRIPTION_PLAN sp
                    JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.plan_id=sp.plan_id AND pv.is_active=1
                    WHERE UPPER(sp.plan_name) = 'BASIC'
                      AND NOT EXISTS (SELECT 1 FROM dbo.USER_SUBSCRIPTION us WHERE us.user_id = ?)
                    """, userId, userId);
        } catch (Exception e) {
            log.error("Failed to insert Basic subscription for user {}: {}", userId, e.getMessage());
        }
    }

    private AuthToken getToken(String tokenValue, TokenType expectedType) {
        AuthToken t = authTokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new BadRequestException("Invalid token"));
        if (t.getIsUsed()) throw new BadRequestException("Token already used");
        if (t.getExpiresAt().isBefore(LocalDateTime.now())) throw new TokenExpiredException("Token expired");
        if (t.getTokenType() != expectedType) throw new BadRequestException("Invalid token type");
        return t;
    }

    private String resolveRoleName(Integer roleId) {
        if (roleId == null) return "STUDENT";
        String roleName = jdbcTemplate.queryForObject("""
                SELECT TOP 1 role_name
                FROM dbo.ROLE
                WHERE role_id = ?
                """, String.class, roleId);
        String normalized = roleName == null ? "STUDENT" : roleName.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) normalized = normalized.substring(5);
        return "ADMIN".equals(normalized) ? "ADMIN" : "STUDENT";
    }

    private String resolvePlanName(Integer userId) {
        String planName = jdbcTemplate.queryForObject("""
                WITH latest_subscription AS (
                    SELECT TOP 1 sp.plan_name
                    FROM dbo.USER_SUBSCRIPTION us
                    JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = us.plan_id
                    WHERE us.user_id = ?
                    ORDER BY us.end_date DESC, us.subscription_id DESC
                )
                SELECT COALESCE((SELECT plan_name FROM latest_subscription), 'Basic')
                """, String.class, userId);
        return normalizePlanName(planName);
    }

    private String normalizePlanName(String planName) {
        if (planName == null || planName.isBlank()) return "Basic";
        String trimmed = planName.trim();
        // Chuẩn hóa 3 gói gốc cho đẹp; các gói admin tự tạo (vd "NQS") giữ nguyên tên đã lưu
        // thay vì bị ép về "Basic".
        return switch (trimmed.toLowerCase()) {
            case "basic" -> "Basic";
            case "plus" -> "Plus";
            case "pro" -> "Pro";
            default -> trimmed;
        };
    }

    private Integer resolveStudentRoleId() {
        jdbcTemplate.update("""
                IF NOT EXISTS (
                    SELECT 1 FROM dbo.ROLE WHERE UPPER(role_name) = 'STUDENT'
                )
                INSERT INTO dbo.ROLE (role_name, description, created_at)
                VALUES ('STUDENT', 'Default student role', GETDATE())
                """);

        return jdbcTemplate.queryForObject("""
                SELECT TOP 1 role_id
                FROM dbo.ROLE
                WHERE UPPER(role_name) = 'STUDENT'
                """, Integer.class);
    }

    // ── Login Streak ──────────────────────────────────────────────────────────

    @Transactional
    protected int updateLoginStreak(Integer userId) {
        try {
            java.sql.Date today = java.sql.Date.valueOf(LocalDate.now());

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                    SELECT streak_id, current_streak, longest_streak,
                           last_study_date, streak_start_date, total_study_days
                    FROM dbo.STUDY_STREAK
                    WHERE user_id = ?
                    """, userId);

            if (rows.isEmpty()) {
                jdbcTemplate.update("""
                        INSERT INTO dbo.STUDY_STREAK
                            (user_id, current_streak, longest_streak, last_study_date,
                             streak_start_date, total_study_days, status, created_at)
                        VALUES (?, 1, 1, ?, ?, 1, 'Active', GETDATE())
                        """, userId, today, today);
                return 1;
            }

            Map<String, Object> row = rows.get(0);
            Integer streakId   = (Integer) row.get("streak_id");
            int currentStreak  = toInt(row.get("current_streak"));
            int longestStreak  = toInt(row.get("longest_streak"));
            int totalStudyDays = toInt(row.get("total_study_days"));
            java.sql.Date lastDate = (java.sql.Date) row.get("last_study_date");

            if (lastDate != null && lastDate.toLocalDate().equals(LocalDate.now())) {
                return currentStreak;
            }

            int newStreak;
            java.sql.Date newStartDate = (java.sql.Date) row.get("streak_start_date");

            if (lastDate != null && lastDate.toLocalDate().equals(LocalDate.now().minusDays(1))) {
                newStreak = currentStreak + 1;
            } else {
                newStreak = 1;
                newStartDate = today;
            }

            int newLongest   = Math.max(longestStreak, newStreak);
            int newTotalDays = totalStudyDays + 1;

            jdbcTemplate.update("""
                    UPDATE dbo.STUDY_STREAK
                    SET current_streak    = ?,
                        longest_streak    = ?,
                        last_study_date   = ?,
                        streak_start_date = ?,
                        total_study_days  = ?,
                        updated_at        = GETDATE()
                    WHERE streak_id = ?
                    """,
                    newStreak, newLongest, today, newStartDate, newTotalDays, streakId);

            return newStreak;

        } catch (Exception e) {
            return 0;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        return 0;
    }

    private String extractIp(HttpServletRequest req) {
        if (req == null) return "unknown";
        String ip = req.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) return ip.split(",")[0].trim();
        ip = req.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank()) return ip.trim();
        return req.getRemoteAddr();
    }

    private String extractDevice(HttpServletRequest req) {
        if (req == null) return "Unknown";
        String ua = req.getHeader("User-Agent");
        if (ua == null || ua.isBlank()) return "Unknown";
        if (ua.contains("Mobile") || ua.contains("Android") || ua.contains("iPhone")) return "Mobile";
        if (ua.contains("Tablet") || ua.contains("iPad")) return "Tablet";
        return "Desktop";
    }

    /** Tạo mã 6 chữ số ngẫu nhiên dạng "482917" */
    private String generateShortCode() {
        return String.format("%06d", new java.util.Random().nextInt(1_000_000));
    }
}
