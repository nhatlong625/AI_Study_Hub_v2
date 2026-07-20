package com.aistudyhub.dto.response;

import java.util.List;

public class AdminPaymentsOverviewResponse {
    private PaymentStatsResponse stats;
    private List<PaymentMemberResponse> members;

    public AdminPaymentsOverviewResponse() {}

    public AdminPaymentsOverviewResponse(PaymentStatsResponse stats, List<PaymentMemberResponse> members) {
        this.stats = stats;
        this.members = members;
    }

    public PaymentStatsResponse getStats() { return stats; }
    public void setStats(PaymentStatsResponse stats) { this.stats = stats; }

    public List<PaymentMemberResponse> getMembers() { return members; }
    public void setMembers(List<PaymentMemberResponse> members) { this.members = members; }
}
