package com.aistudyhub.repository;
import com.aistudyhub.entity.AuthToken;
import com.aistudyhub.entity.TokenType;
import com.aistudyhub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface AuthTokenRepository extends JpaRepository<AuthToken, Integer> {
    Optional<AuthToken> findByToken(String token);
    
    // Tìm token theo prefix "SHORTCODE-" (dùng khi user nhập mã 6 số từ email)
    Optional<AuthToken> findFirstByTokenStartingWithAndTokenTypeAndIsUsedFalse(String prefix, TokenType tokenType);
    
    @Modifying
    @Query("UPDATE AuthToken t SET t.isUsed = true WHERE t.user = :user AND t.tokenType = :type AND t.isUsed = false")
    void invalidateTokensByUserAndType(User user, TokenType type);
}
