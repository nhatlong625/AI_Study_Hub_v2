package com.aistudyhub.dto.response;

import lombok.Data;

@Data
public class DocumentShareResponse {
    private Integer shareId;
    private Integer documentId;
    private String shareType;
    private String status;
    // URL đầy đủ để FE hiện cho user copy — ví dụ: http://localhost:5173/share/3
    private String shareUrl;
}
