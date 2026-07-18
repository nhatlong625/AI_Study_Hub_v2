package com.aistudyhub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AiStudyHubApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiStudyHubApplication.class, args);
    }
}
