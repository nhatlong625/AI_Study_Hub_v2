package com.aistudyhub.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class ResetPasswordRequest {
    @NotBlank String token;
    @NotBlank @Size(min = 8) String newPassword;
}
