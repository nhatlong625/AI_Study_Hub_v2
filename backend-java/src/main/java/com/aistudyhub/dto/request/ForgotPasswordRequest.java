package com.aistudyhub.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class ForgotPasswordRequest {
    @NotBlank @Email String email;
}
