package com.aistudyhub.dto.response;

public class PaymentStatsResponse {
    private long totalRevenue;
    private long activeSubscriptions;
    private long pendingInvoices;

    public PaymentStatsResponse() {}

    public PaymentStatsResponse(long totalRevenue, long activeSubscriptions, long pendingInvoices) {
        this.totalRevenue = totalRevenue;
        this.activeSubscriptions = activeSubscriptions;
        this.pendingInvoices = pendingInvoices;
    }

    public long getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(long totalRevenue) { this.totalRevenue = totalRevenue; }

    public long getActiveSubscriptions() { return activeSubscriptions; }
    public void setActiveSubscriptions(long activeSubscriptions) { this.activeSubscriptions = activeSubscriptions; }

    public long getPendingInvoices() { return pendingInvoices; }
    public void setPendingInvoices(long pendingInvoices) { this.pendingInvoices = pendingInvoices; }
}
