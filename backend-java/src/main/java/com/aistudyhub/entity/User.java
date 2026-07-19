package com.aistudyhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "[USER]")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class User implements UserDetails {
    public static final int ROLE_STUDENT_ID = 1;
    public static final int ROLE_ADMIN_ID = 2;

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String password;

    @Column(name = "role_id")
    private Integer roleId;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "status", length = 30)
    @Builder.Default
    private String status = "Active";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "Active";
        if (roleId == null) roleId = ROLE_STUDENT_ID;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String roleName = roleId != null && roleId == ROLE_ADMIN_ID ? "ADMIN" : "STUDENT";
        return List.of(new SimpleGrantedAuthority("ROLE_" + roleName));
    }

    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()               { return "Active".equals(status); }
}
