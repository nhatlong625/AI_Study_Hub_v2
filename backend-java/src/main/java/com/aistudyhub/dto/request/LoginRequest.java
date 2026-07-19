package com.aistudyhub.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class LoginRequest {
    @NotBlank @Email String email;
    @NotBlank String password;
}
