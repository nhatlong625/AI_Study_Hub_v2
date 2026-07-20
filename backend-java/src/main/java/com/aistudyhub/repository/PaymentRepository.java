package com.aistudyhub.repository;

import com.aistudyhub.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Integer> {
    Optional<Payment> findByOrderCode(Long orderCode);
    List<Payment> findAllByOrderByCreatedAtDesc();
}
