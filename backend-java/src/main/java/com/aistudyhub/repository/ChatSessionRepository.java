package com.aistudyhub.repository;

import com.aistudyhub.dto.response.ChatSessionDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
public class ChatSessionRepository {

    private static final @NonNull RowMapper<ChatSessionDto> ROW_MAPPER = (rs, rowNum) ->
            new ChatSessionDto(
                    rs.getInt("session_id"),
                    rs.getInt("user_id"),
                    rs.getObject("document_id") == null ? null : rs.getInt("document_id"),
                    rs.getString("session_title"),
                    rs.getTimestamp("created_at").toLocalDateTime(),
                    rs.getTimestamp("updated_at") == null ? null : rs.getTimestamp("updated_at").toLocalDateTime()
            );

    private final JdbcTemplate jdbc;
    public ChatSessionRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<ChatSessionDto> findByUserId(Integer userId) {
        return jdbc.query("""
            SELECT session_id, user_id, document_id, session_title, created_at, updated_at
            FROM CHAT_SESSION WHERE user_id = ?
            ORDER BY updated_at DESC, created_at DESC
            """, ROW_MAPPER, userId);
    }

    public Optional<ChatSessionDto> findById(Integer sessionId) {
        return jdbc.query("""
            SELECT session_id, user_id, document_id, session_title, created_at, updated_at
            FROM CHAT_SESSION WHERE session_id = ?
            """, ROW_MAPPER, sessionId).stream().findFirst();
    }

    public ChatSessionDto save(Integer userId, Integer documentId, String title) {
        LocalDateTime now = LocalDateTime.now();
        KeyHolder key = new GeneratedKeyHolder();
        jdbc.update(conn -> {
            PreparedStatement ps = conn.prepareStatement("""
                INSERT INTO CHAT_SESSION (user_id, document_id, session_title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, userId);
            if (documentId == null) ps.setNull(2, Types.INTEGER); else ps.setInt(2, documentId);
            ps.setString(3, title);
            ps.setObject(4, now);
            ps.setObject(5, now);
            return ps;
        }, key);
        return findById(Objects.requireNonNull(key.getKey()).intValue()).orElseThrow();
    }

    public void touch(Integer sessionId) {
        jdbc.update("UPDATE CHAT_SESSION SET updated_at = ? WHERE session_id = ?", LocalDateTime.now(), sessionId);
    }

    public void updateDocumentId(Integer sessionId, Integer documentId) {
        jdbc.update(
                "UPDATE CHAT_SESSION SET document_id = ?, updated_at = ? WHERE session_id = ?",
                documentId, LocalDateTime.now(), sessionId
        );
    }

    public int deleteById(Integer sessionId) {
        return jdbc.update("DELETE FROM CHAT_SESSION WHERE session_id = ?", sessionId);
    }
}
