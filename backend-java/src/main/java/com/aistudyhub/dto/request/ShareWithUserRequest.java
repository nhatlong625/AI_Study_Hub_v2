package com.aistudyhub.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShareWithUserRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Pattern(regexp = "VIEW|EDIT", message = "Permission must be VIEW or EDIT")
    private String permission;

    // TODO: thay bằng userId từ auth context khi có JWT
    private Integer ownerUserId = 1;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPermission() { return permission; }
    public void setPermission(String permission) { this.permission = permission; }

    public Integer getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(Integer ownerUserId) { this.ownerUserId = ownerUserId; }
}