package com.aistudyhub.controller;

import com.aistudyhub.dto.request.CreatePaymentLinkRequest;
import com.aistudyhub.dto.response.PaymentLinkResponse;
import com.aistudyhub.service.PaymentService;
import com.aistudyhub.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Payment (B5) — gộp từ source bạn của Bạn (PayOS create-link + webhook).
 * Không dùng @CrossOrigin riêng — CORS đã xử lý tập trung ở SecurityConfig.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final NamedParameterJdbcTemplate jdbc;
    private final CurrentUser currentUser;

    @GetMapping("/plans")
    public Map<String, Object> getPublicPlans() {
        List<Map<String, Object>> plans = jdbc.queryForList("""
            SELECT UPPER(sp.plan_name) AS [plan], pv.version_id AS versionId, pv.version_no AS versionNo,
                   pv.price, pv.monthly_discount_percent AS monthlyDiscount,
                   pv.yearly_discount_percent AS yearlyDiscount,
                   CASE WHEN pv.duration_month >= 12 THEN 'Yearly' ELSE 'Monthly' END AS billing,
                   pv.max_storage AS maxStorage, pv.max_quiz_per_month AS maxQuiz,
                   COALESCE(pv.features_json, '[]') AS description
            FROM dbo.SUBSCRIPTION_PLAN sp
            JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.plan_id = sp.plan_id AND pv.is_active = 1
            WHERE pv.effective_from <= SYSDATETIME() AND (pv.effective_to IS NULL OR pv.effective_to > SYSDATETIME())
            ORDER BY CASE UPPER(sp.plan_name) WHEN 'BASIC' THEN 1 ELSE 2 END,
                     pv.price ASC,
                     UPPER(sp.plan_name)
            """, Map.of());
        return Map.of("plans", plans);
    }

    @PostMapping("/payos/create-link")
    public ResponseEntity<?> createPaymentLink(@RequestBody CreatePaymentLinkRequest request) {
        try {
            log.info("Received payment link creation request for order: {}", request.getOrderCode());

            request.setUserId(currentUser.id());
            if (request.getOrderCode() == null || request.getOrderCode() <= 0) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Order code is required"));
            }
            if (request.getAmount() == null || request.getAmount() <= 0) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Amount must be greater than 0"));
            }
            if (request.getPlanCode() == null || request.getPlanCode().isBlank()) {
                return ResponseEntity.badRequest().body(new ErrorResponse("planCode is required"));
            }

            PaymentLinkResponse response = paymentService.createPaymentLink(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error creating payment link", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to create payment link: " + e.getMessage()));
        }
    }

    @GetMapping("/payos/status/{orderCode}")
    public ResponseEntity<?> checkPaymentStatus(@PathVariable Long orderCode) {
        try {
            Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM dbo.PAYMENT WHERE order_code=:orderCode AND user_id=:userId
                """, Map.of("orderCode", orderCode, "userId", currentUser.id()), Integer.class);
            if (count == null || count == 0) return ResponseEntity.notFound().build();
            String status = paymentService.checkAndActivate(orderCode);
            return ResponseEntity.ok(Map.of("status", status));
        } catch (Exception e) {
            log.error("Error checking payment status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to check payment status: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Payment service is running");
    }

    @PostMapping("/payos/webhook")
    public ResponseEntity<String> handlePayosWebhook(@RequestBody Map<String, Object> payload) {
        log.info("Received PayOS webhook payload: {}", payload);

        if (!paymentService.isValidWebhook(payload)) {
            log.warn("Rejected PayOS webhook because signature is invalid");
            return ResponseEntity.badRequest().body("Invalid webhook");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        log.info(
                "PayOS payment confirmed. orderCode={}, amount={}, code={}, desc={}",
                data.get("orderCode"),
                data.get("amount"),
                data.get("code"),
                data.get("desc")
        );

        paymentService.handleWebhookConfirmed(data);

        return ResponseEntity.ok("OK");
    }

    public static class ErrorResponse {
        public String error;

        public ErrorResponse(String error) {
            this.error = error;
        }

        public String getError() { return error; }
        public void setError(String error) { this.error = error; }
    }
}
