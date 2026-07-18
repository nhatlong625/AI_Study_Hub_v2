package com.aistudyhub.repository;

import com.aistudyhub.dto.response.ChatMessageDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public class ChatMessageRepository {

    private static final @NonNull RowMapper<ChatMessageDto> ROW_MAPPER = (rs, rowNum) ->
            new ChatMessageDto(
                    rs.getInt("message_id"),
                    rs.getInt("session_id"),
                    rs.getString("session_type"),
                    rs.getString("message_content"),
                    rs.getTimestamp("created_at").toLocalDateTime(),
                    rs.getString("sources_json")
            );

    private final JdbcTemplate jdbc;
    public ChatMessageRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<ChatMessageDto> findBySessionId(Integer sessionId) {
        return jdbc.query("""
            SELECT message_id, session_id, session_type, message_content, created_at, sources_json
            FROM CHAT_MESSAGE WHERE session_id = ?
            ORDER BY created_at ASC, message_id ASC
            """, ROW_MAPPER, sessionId);
    }

    public List<String> findLatestSourcesJsonBySessionId(Integer sessionId) {
        return jdbc.queryForList("""
            SELECT TOP 1 sources_json
            FROM CHAT_MESSAGE
            WHERE session_id = ?
              AND session_type = 'assistant'
              AND sources_json IS NOT NULL
              AND LTRIM(RTRIM(sources_json)) <> ''
            ORDER BY created_at DESC, message_id DESC
            """, String.class, sessionId);
    }

    public void save(Integer sessionId, String role, String content) {
        save(sessionId, role, content, null);
    }

    public void save(Integer sessionId, String role, String content, String sourcesJson) {
        jdbc.update("""
            INSERT INTO CHAT_MESSAGE (session_id, session_type, message_content, created_at, sources_json)
            VALUES (?, ?, ?, ?, ?)
            """, sessionId, role, content, LocalDateTime.now(), sourcesJson);
    }

    public int deleteBySessionId(Integer sessionId) {
        return jdbc.update("DELETE FROM CHAT_MESSAGE WHERE session_id = ?", sessionId);
    }
}
