package com.aistudyhub.dto.response;
import java.time.LocalDateTime;
public class UserShareResponse {
    private Integer shareId; private Integer documentId; private String documentTitle;
    private String documentName; private String documentUrl; private String permission; private String status;
    private Integer ownerUserId; private String ownerName; private String ownerEmail;
    private Integer sharedToUserId; private String sharedToName; private String sharedToEmail;
    private LocalDateTime sharedAt;
    // Visibility của document gốc — dùng để FE vẽ toggle PRIVATE/PENDING_REVIEW/PUBLIC
    // và tính cooldown 1h (giống pattern ở StudentLibraryCourseDetailPage)
    private String visibilityStatus;
    private LocalDateTime updatedAt;
    public Integer getShareId() { return shareId; } public void setShareId(Integer v) { this.shareId = v; }
    public Integer getDocumentId() { return documentId; } public void setDocumentId(Integer v) { this.documentId = v; }
    public String getDocumentTitle() { return documentTitle; } public void setDocumentTitle(String v) { this.documentTitle = v; }
    public String getDocumentName() { return documentName; } public void setDocumentName(String v) { this.documentName = v; }
    public String getDocumentUrl() { return documentUrl; } public void setDocumentUrl(String v) { this.documentUrl = v; }
    public String getPermission() { return permission; } public void setPermission(String v) { this.permission = v; }
    public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
    public Integer getOwnerUserId() { return ownerUserId; } public void setOwnerUserId(Integer v) { this.ownerUserId = v; }
    public String getOwnerName() { return ownerName; } public void setOwnerName(String v) { this.ownerName = v; }
    public String getOwnerEmail() { return ownerEmail; } public void setOwnerEmail(String v) { this.ownerEmail = v; }
    public Integer getSharedToUserId() { return sharedToUserId; } public void setSharedToUserId(Integer v) { this.sharedToUserId = v; }
    public String getSharedToName() { return sharedToName; } public void setSharedToName(String v) { this.sharedToName = v; }
    public String getSharedToEmail() { return sharedToEmail; } public void setSharedToEmail(String v) { this.sharedToEmail = v; }
    public LocalDateTime getSharedAt() { return sharedAt; } public void setSharedAt(LocalDateTime v) { this.sharedAt = v; }
    public String getVisibilityStatus() { return visibilityStatus; } public void setVisibilityStatus(String v) { this.visibilityStatus = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(LocalDateTime v) { this.updatedAt = v; }
}