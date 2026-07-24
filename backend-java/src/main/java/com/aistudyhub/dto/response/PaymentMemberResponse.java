package com.aistudyhub.dto.response;

/** Khớp field FE đang render ở AdminPaymentManagementPage.jsx (bảng Subscribed Members). */
public class PaymentMemberResponse {
    private String id;
    private String name;
    private String email;
    private String plan;        // PLUS | PRO
    private String status;      // Active | Expired | Pending
    private String billing;     // Monthly | Yearly
    private String paymentDate; // đã format sẵn, ví dụ "Jun 01, 2026"
    private String initials;
    private String avatarBg;
    private String avatarColor;

    public PaymentMemberResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBilling() { return billing; }
    public void setBilling(String billing) { this.billing = billing; }

    public String getPaymentDate() { return paymentDate; }
    public void setPaymentDate(String paymentDate) { this.paymentDate = paymentDate; }

    public String getInitials() { return initials; }
    public void setInitials(String initials) { this.initials = initials; }

    public String getAvatarBg() { return avatarBg; }
    public void setAvatarBg(String avatarBg) { this.avatarBg = avatarBg; }

    public String getAvatarColor() { return avatarColor; }
    public void setAvatarColor(String avatarColor) { this.avatarColor = avatarColor; }
}
