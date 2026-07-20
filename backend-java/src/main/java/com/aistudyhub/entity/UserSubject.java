package com.aistudyhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_SUBJECT")
@Data @NoArgsConstructor @AllArgsConstructor
public class UserSubject {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_subject_id")
    private Integer userSubjectId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "subject_id")
    private Integer subjectId;

    @Column(name = "added_at")
    private LocalDateTime addedAt;
}
