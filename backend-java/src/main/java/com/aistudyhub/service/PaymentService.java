package com.aistudyhub.service;

import com.aistudyhub.dto.request.CreatePaymentLinkRequest;
import com.aistudyhub.dto.response.AdminPaymentsOverviewResponse;
import com.aistudyhub.dto.response.PaymentLinkResponse;
import com.aistudyhub.dto.response.PaymentMemberResponse;
import com.aistudyhub.dto.response.PaymentStatsResponse;
import com.aistudyhub.entity.Payment;
import com.aistudyhub.entity.User;
import com.aistudyhub.repository.PaymentRepository;
import com.aistudyhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final WebClient payosWebClient;
    private final NamedParameterJdbcTemplate jdbc;

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    @Value("${payos.gateway:}")
    private String payosGateway;

    @Value("${payos.gateway-code:}")
    private String payosGatewayCode;

    private static final String[][] AVATAR_PALETTE = {
            { "#DBEAFE", "#1D4ED8" }, { "#FEF3C7", "#B45309" }, { "#FCE7F3", "#BE185D" },
            { "#D1FAE5", "#047857" }, { "#F3E8FF", "#7C3AED" }, { "#FFE4E6", "#BE123C" },
            { "#FEF9C3", "#A16207" }, { "#E2E8F0", "#334155" },
    };

    public PaymentLinkResponse createPaymentLink(CreatePaymentLinkRequest request) {
        try {
            if (checksumKey == null || checksumKey.isBlank() || clientId == null || clientId.isBlank() || apiKey == null
                    || apiKey.isBlank()) {
                throw new RuntimeException("PayOS credentials are not configured.");
            }

            long effectiveAmount = calculateEffectiveAmount(request.getPlanCode(), request.getBillingCycle());
            request.setAmount(effectiveAmount);

            Map<String, Object> payload = new HashMap<>();
            payload.put("orderCode", request.getOrderCode());
            payload.put("amount", request.getAmount());
            payload.put("description", request.getDescription());
            payload.put("returnUrl", request.getReturnUrl());
            payload.put("cancelUrl", request.getCancelUrl());
            if (request.getGateway() != null && !request.getGateway().isBlank()) {
                payload.put("gateway", request.getGateway());
            } else if (payosGateway != null && !payosGateway.isBlank()) {
                payload.put("gateway", payosGateway);
            }
            if (request.getGatewayCode() != null && !request.getGatewayCode().isBlank()) {
                payload.put("gatewayCode", request.getGatewayCode());
            } else if (payosGatewayCode != null && !payosGatewayCode.isBlank()) {
                payload.put("gatewayCode", payosGatewayCode);
            }
            payload.put("signature", hmacSha256(buildSignaturePayload(payload), checksumKey));

            @SuppressWarnings("unchecked")
            Map<String, Object> resp = payosWebClient.post()
                    .uri("/v2/payment-requests")
                    .header("Content-Type", "application/json")
                    .header("x-client-id", clientId)
                    .header("x-api-key", apiKey)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (resp == null || !"00".equals(String.valueOf(resp.get("code")))) {
                throw new RuntimeException("PayOS response: " + resp);
            }

            Object dataObject = resp.get("data");
            if (!(dataObject instanceof Map<?, ?> data) || data.get("checkoutUrl") == null) {
                throw new RuntimeException("Invalid response from PayOS");
            }

            String checkoutUrl = String.valueOf(data.get("checkoutUrl"));

            Payment payment = new Payment();
            payment.setUserId(request.getUserId());
            payment.setOrderCode(request.getOrderCode());
            payment.setPlanCode(request.getPlanCode());
            payment.setBillingCycle(request.getBillingCycle());
            payment.setAmount(request.getAmount());
            payment.setStatus("PENDING");
            payment.setCheckoutUrl(checkoutUrl);
            paymentRepository.save(payment);

            return new PaymentLinkResponse(checkoutUrl, request.getOrderCode(), request.getAmount());
        } catch (Exception e) {
            log.error("Failed to create payment link", e);
            throw new RuntimeException("Failed to create payment link: " + e.getMessage(), e);
        }
    }

    private long calculateEffectiveAmount(String planCode, String billingCycle) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT TOP 1 pv.price, pv.monthly_discount_percent AS monthlyDiscount,
                         pv.yearly_discount_percent AS yearlyDiscount
            FROM dbo.SUBSCRIPTION_PLAN sp
            JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.plan_id=sp.plan_id AND pv.is_active=1
            WHERE UPPER(sp.plan_name)=UPPER(:planCode)
              AND pv.effective_from <= SYSDATETIME()
              AND (pv.effective_to IS NULL OR pv.effective_to > SYSDATETIME())
            ORDER BY pv.version_no DESC
            """, Map.of("planCode", planCode));
        if (rows.isEmpty()) throw new IllegalArgumentException("No active version found for plan " + planCode);
        Map<String, Object> row = rows.get(0);
        boolean yearly = "YEARLY".equalsIgnoreCase(String.valueOf(billingCycle));
        BigDecimal base = new BigDecimal(String.valueOf(row.get("price")));
        BigDecimal discount = new BigDecimal(String.valueOf(row.get(yearly ? "yearlyDiscount" : "monthlyDiscount")));
        BigDecimal multiplier = yearly ? new BigDecimal("12") : BigDecimal.ONE;
        long amount = base.multiply(multiplier)
                .multiply(new BigDecimal("100").subtract(discount))
                .divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP)
                .longValueExact();
        if (amount <= 0) throw new IllegalArgumentException("Calculated payment amount must be greater than 0");
        return amount;
    }

    @SuppressWarnings("unchecked")
    public String checkAndActivate(Long orderCode) {
        try {
            Map<String, Object> resp = payosWebClient.get()
                .uri("/v2/payment-requests/" + orderCode)
                .header("x-client-id", clientId)
                .header("x-api-key", apiKey)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            if (resp == null || !"00".equals(String.valueOf(resp.get("code")))) {
                log.warn("PayOS status check failed for orderCode={}: {}", orderCode, resp);
                return "UNKNOWN";
            }

            Map<String, Object> data = (Map<String, Object>) resp.get("data");
            String status = String.valueOf(data.get("status"));

            if ("PAID".equals(status)) {
                paymentRepository.findByOrderCode(orderCode).ifPresent(payment -> {
                    if (!"PAID".equals(payment.getStatus())) {
                        payment.setStatus("PAID");
                        payment.setPaidAt(LocalDateTime.now());
                        paymentRepository.save(payment);
                        activateSubscription(payment);
                    }
                });
            }
            return status;
        } catch (Exception e) {
            log.error("checkAndActivate failed for orderCode={}", orderCode, e);
            return "ERROR";
        }
    }

    public void handleWebhookConfirmed(Map<String, Object> data) {
        Object orderCodeObj = data.get("orderCode");
        if (orderCodeObj == null) {
            log.warn("PayOS webhook missing orderCode, skip");
            return;
        }
        Long orderCode = Long.parseLong(String.valueOf(orderCodeObj));
        paymentRepository.findByOrderCode(orderCode).ifPresentOrElse(payment -> {
            if ("PAID".equals(payment.getStatus())) {
                log.info("Payment orderCode={} already PAID, skip", orderCode);
                return;
            }
            payment.setStatus("PAID");
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);
            log.info("Payment orderCode={} marked PAID for userId={}", orderCode, payment.getUserId());
            activateSubscription(payment);
        }, () -> log.warn("PayOS webhook orderCode={} did not match any payment", orderCode));
    }

    private void activateSubscription(Payment payment) {
        try {
            List<Map<String, Object>> plans = jdbc.queryForList(
                """
                SELECT TOP 1 sp.plan_id AS planId, pv.version_id AS versionId, pv.duration_month AS months
                FROM dbo.SUBSCRIPTION_PLAN sp
                JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.plan_id=sp.plan_id AND pv.is_active=1
                WHERE UPPER(sp.plan_name)=UPPER(:plan) AND pv.effective_from<=SYSDATETIME()
                  AND (pv.effective_to IS NULL OR pv.effective_to>SYSDATETIME())
                ORDER BY pv.version_no DESC
                """,
                Map.of("plan", payment.getPlanCode())
            );
            if (plans.isEmpty()) {
                log.warn("No SUBSCRIPTION_PLAN found for planCode={}", payment.getPlanCode());
                return;
            }
            Integer planId = ((Number) plans.get(0).get("planId")).intValue();
            Integer latestVersionId = ((Number) plans.get(0).get("versionId")).intValue();
            long months = "Yearly".equalsIgnoreCase(payment.getBillingCycle()) ? 12 : 1;
            LocalDate endDate = LocalDate.now().plusMonths(months);

            List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT TOP 1 subscription_id AS id, plan_id AS planId, version_id AS versionId, renewal_policy AS renewalPolicy FROM dbo.USER_SUBSCRIPTION WHERE user_id = :userId ORDER BY end_date DESC, subscription_id DESC",
                Map.of("userId", payment.getUserId())
            );
            MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("userId", payment.getUserId())
                .addValue("planId", planId)
                .addValue("versionId", latestVersionId)
                .addValue("endDate", endDate);
            if (existing.isEmpty()) {
                jdbc.update(
                    "INSERT INTO dbo.USER_SUBSCRIPTION (user_id, plan_id, version_id, start_date, end_date, status, renewal_policy) VALUES (:userId, :planId, :versionId, CAST(GETDATE() AS DATE), :endDate, 'Active', 'KEEP_VERSION')",
                    p
                );
            } else {
                Map<String, Object> old = existing.get(0);
                // The subscriber's renewal policy decides what a renewal of the same plan does:
                // KEEP_VERSION keeps the grandfathered version they bought, LATEST_VERSION (and any
                // plan change or new purchase) moves them to the plan's latest active version.
                boolean samePlan = ((Number) old.get("planId")).intValue() == planId;
                boolean keepVersion = "KEEP_VERSION".equalsIgnoreCase(String.valueOf(old.get("renewalPolicy")));
                int selectedVersionId = samePlan && keepVersion
                        ? ((Number) old.get("versionId")).intValue() : latestVersionId;
                p.addValue("versionId", selectedVersionId).addValue("id", ((Number) old.get("id")).intValue());
                jdbc.update("UPDATE dbo.USER_SUBSCRIPTION SET plan_id=:planId, version_id=:versionId, end_date=:endDate, status='Active' WHERE subscription_id=:id", p);
            }

            Map<String, Object> sub = jdbc.queryForMap(
                "SELECT TOP 1 subscription_id AS id FROM dbo.USER_SUBSCRIPTION WHERE user_id = :userId ORDER BY subscription_id DESC",
                Map.of("userId", payment.getUserId())
            );
            Integer subscriptionId = ((Number) sub.get("id")).intValue();

            jdbc.update(
                "INSERT INTO dbo.PAYMENT_HISTORY (subscription_id, amount, payment_method, transaction_code, payment_status, payment_date) VALUES (:subId, :amount, 'PayOS', :txCode, 'Success', GETDATE())",
                new MapSqlParameterSource()
                    .addValue("subId", subscriptionId)
                    .addValue("amount", payment.getAmount())
                    .addValue("txCode", String.valueOf(payment.getOrderCode()))
            );
            Map<String, Object> previous = existing.isEmpty() ? Map.of() : existing.get(0);
            Integer finalVersionId = jdbc.queryForObject("SELECT version_id FROM dbo.USER_SUBSCRIPTION WHERE subscription_id=:id", Map.of("id", subscriptionId), Integer.class);
            jdbc.update("""
                INSERT INTO dbo.SUBSCRIPTION_HISTORY
                    (subscription_id,user_id,old_plan_id,old_version_id,new_plan_id,new_version_id,payment_id,change_type,notes,changed_at)
                VALUES (:subscriptionId,:userId,:oldPlanId,:oldVersionId,:newPlanId,:newVersionId,:paymentId,:changeType,:notes,SYSDATETIME())
                """, new MapSqlParameterSource("subscriptionId", subscriptionId)
                    .addValue("userId", payment.getUserId()).addValue("oldPlanId", previous.get("planId"))
                    .addValue("oldVersionId", previous.get("versionId")).addValue("newPlanId", planId)
                    .addValue("newVersionId", finalVersionId).addValue("paymentId", payment.getPaymentId())
                    .addValue("changeType", existing.isEmpty() ? "PURCHASE" : "RENEW_OR_CHANGE")
                    .addValue("notes", "PayOS order " + payment.getOrderCode()));
            log.info("Activated subscription for userId={}, plan={}", payment.getUserId(), payment.getPlanCode());
        } catch (Exception e) {
            log.error("Failed to activate subscription for userId={}", payment.getUserId(), e);
        }
    }

    public boolean isValidWebhook(Map<String, Object> payload) {
        Object dataObject = payload.get("data");
        Object signatureObject = payload.get("signature");
        if (!(dataObject instanceof Map<?, ?> data) || signatureObject == null || checksumKey == null
                || checksumKey.isBlank()) {
            return false;
        }
        try {
            TreeMap<String, Object> sortedData = new TreeMap<>();
            data.forEach((key, value) -> {
                if (key != null)
                    sortedData.put(String.valueOf(key), value);
            });
            StringBuilder signaturePayload = new StringBuilder();
            for (Map.Entry<String, Object> entry : sortedData.entrySet()) {
                if (!signaturePayload.isEmpty())
                    signaturePayload.append("&");
                signaturePayload.append(entry.getKey()).append("=")
                        .append(entry.getValue() == null ? "" : entry.getValue());
            }
            String expectedSignature = hmacSha256(signaturePayload.toString(), checksumKey);
            return expectedSignature.equals(String.valueOf(signatureObject));
        } catch (Exception e) {
            log.error("Failed to verify PayOS webhook signature", e);
            return false;
        }
    }

    public AdminPaymentsOverviewResponse getAdminOverview() {
        List<Payment> allPayments = paymentRepository.findAllByOrderByCreatedAtDesc();
        long totalRevenue = allPayments.stream().filter(p -> "PAID".equals(p.getStatus())).mapToLong(Payment::getAmount)
                .sum();
        long pendingInvoices = allPayments.stream().filter(p -> "PENDING".equals(p.getStatus())).count();
        Map<Integer, Payment> latestByUser = new LinkedHashMap<>();
        for (Payment p : allPayments)
            latestByUser.putIfAbsent(p.getUserId(), p);

        List<PaymentMemberResponse> members = new ArrayList<>();
        long activeSubscriptions = 0;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM dd, yyyy");
        for (Map.Entry<Integer, Payment> entry : latestByUser.entrySet()) {
            Optional<User> userOpt = userRepository.findById(entry.getKey());
            if (userOpt.isEmpty())
                continue;
            User user = userOpt.get();
            Payment latest = entry.getValue();
            boolean isPaid = "PAID".equals(latest.getStatus());
            boolean expired = isPaid && isCycleExpired(latest.getPaidAt(), latest.getBillingCycle());
            String memberStatus = isPaid ? (expired ? "Expired" : "Active")
                    : "PENDING".equals(latest.getStatus()) ? "Pending" : "Failed";
            if ("Active".equals(memberStatus))
                activeSubscriptions++;
            PaymentMemberResponse member = new PaymentMemberResponse();
            member.setId("U-" + user.getUserId());
            member.setName(user.getFullName());
            member.setEmail(user.getEmail());
            member.setPlan(latest.getPlanCode());
            member.setStatus(memberStatus);
            member.setBilling(latest.getBillingCycle());
            LocalDateTime dateForDisplay = latest.getPaidAt() != null ? latest.getPaidAt() : latest.getCreatedAt();
            member.setPaymentDate(dateForDisplay != null ? dateForDisplay.format(fmt) : "");
            member.setInitials(initialsOf(user.getFullName()));
            String[] colors = AVATAR_PALETTE[Math.abs(user.getUserId()) % AVATAR_PALETTE.length];
            member.setAvatarBg(colors[0]);
            member.setAvatarColor(colors[1]);
            members.add(member);
        }
        return new AdminPaymentsOverviewResponse(
                new PaymentStatsResponse(totalRevenue, activeSubscriptions, pendingInvoices), members);
    }

    private boolean isCycleExpired(LocalDateTime paidAt, String billingCycle) {
        if (paidAt == null)
            return true;
        long daysValid = "Yearly".equalsIgnoreCase(billingCycle) ? 365 : 30;
        return paidAt.plusDays(daysValid).isBefore(LocalDateTime.now());
    }

    private String initialsOf(String fullName) {
        if (fullName == null || fullName.isBlank())
            return "?";
        String[] parts = fullName.trim().split("\\s+");
        String first = parts[0].substring(0, 1);
        String last = parts.length > 1 ? parts[parts.length - 1].substring(0, 1) : "";
        return (first + last).toUpperCase(Locale.ROOT);
    }

    private String buildSignaturePayload(Map<String, Object> payload) {
        // PayOS chỉ ký đúng 5 field này theo thứ tự alphabet
        List<String> keys = List.of("amount", "cancelUrl", "description", "orderCode", "returnUrl");
        StringBuilder builder = new StringBuilder();
        for (String key : keys) {
            if (payload.containsKey(key)) {
                if (builder.length() > 0) builder.append("&");
                builder.append(key).append("=").append(payload.get(key) == null ? "" : payload.get(key));
            }
        }
        return builder.toString();
    }

    private String hmacSha256(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] sig = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : sig)
            sb.append(String.format(Locale.ROOT, "%02x", b));
        return sb.toString();
    }
}
