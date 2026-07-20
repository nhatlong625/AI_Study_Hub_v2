package com.aistudyhub.dto.response;

public class PaymentLinkResponse {
    private String checkoutUrl;
    private Long orderCode;
    private Long amount;

    public PaymentLinkResponse() {}

    public PaymentLinkResponse(String checkoutUrl, Long orderCode, Long amount) {
        this.checkoutUrl = checkoutUrl;
        this.orderCode = orderCode;
        this.amount = amount;
    }

    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String checkoutUrl) { this.checkoutUrl = checkoutUrl; }

    public Long getOrderCode() { return orderCode; }
    public void setOrderCode(Long orderCode) { this.orderCode = orderCode; }

    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
}
