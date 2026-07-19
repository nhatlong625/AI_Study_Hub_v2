package com.aistudyhub.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class RegisterRequest {
    @NotBlank String fullName;
    @NotBlank @Email String email;
    @NotBlank @Size(min = 8) String password;
}
