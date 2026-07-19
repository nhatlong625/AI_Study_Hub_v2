package com.aistudyhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "DOCUMENT_SHARE")
@Data @NoArgsConstructor @AllArgsConstructor
public class DocumentShare {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "share_id")
    private Integer shareId;

    @Column(name = "document_id")
    private Integer documentId;

    // user_id = người tạo link share (chủ document)
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "description", length = 500)
    private String description;

    // share_type: "LINK" (ai có link xem được) | "USER" (share cho user cụ thể — dùng sau B1)
    @Column(name = "share_type", length = 30)
    private String shareType;

    @Column(name = "shared_to_user_id")
    private Integer sharedToUserId;

    @Column(name = "permission", length = 10)
    private String permission;

    // status: "ACTIVE" | "REVOKED"
    @Column(name = "status", length = 30)
    private String status;
}
