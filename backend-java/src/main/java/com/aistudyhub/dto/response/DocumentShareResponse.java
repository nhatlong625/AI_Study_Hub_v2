package com.aistudyhub.dto.response;

import lombok.Data;

@Data
public class DocumentShareResponse {
    private Integer shareId;
    private Integer documentId;
    private String shareToken;
    private String shareType;
    private String status;
    // URL đầy đủ để FE hiện cho user copy — ví dụ: http://localhost:5173/share/9f2c...
    private String shareUrl;
}
