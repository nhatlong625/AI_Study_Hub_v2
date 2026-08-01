package com.aistudyhub.service;

import com.aistudyhub.exception.BadRequestException;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.jodconverter.core.office.OfficeException;
import org.jodconverter.local.JodConverter;
import org.jodconverter.local.office.LocalOfficeManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Chuyển file Office sang PDF qua LibreOffice.
 *
 * LocalOfficeManager là singleton dùng chung cho toàn app: builder().install() đăng ký
 * manager ở mức global nên nếu mỗi lần upload lại install/start một cái mới thì hai
 * upload đồng thời sẽ ghi đè nhau và fail. Manager được start lazy ở lần convert đầu
 * tiên để app vẫn boot được trên máy chưa cài LibreOffice.
 */
@Service
public class DocumentConversionService {

    private static final Logger log = LoggerFactory.getLogger(DocumentConversionService.class);

    @Value("${document-conversion.office-home:}")
    private String officeHome;

    private volatile LocalOfficeManager officeManager;

    public byte[] convertToPdf(byte[] source, String extension, String originalName) throws IOException {
        ensureStarted(originalName);

        Path tempDir = Files.createTempDirectory("aistudyhub-convert-");
        Path inputPath = tempDir.resolve("input." + extension);
        Path outputPath = tempDir.resolve("output.pdf");
        try {
            Files.write(inputPath, source);
            JodConverter.convert(inputPath.toFile()).to(outputPath.toFile()).execute();
            return Files.readAllBytes(outputPath);
        } catch (OfficeException e) {
            throw conversionFailed(originalName, e);
        } finally {
            deleteQuietly(outputPath);
            deleteQuietly(inputPath);
            deleteQuietly(tempDir);
        }
    }

    private synchronized void ensureStarted(String originalName) {
        if (officeManager != null && officeManager.isRunning()) {
            return;
        }
        try {
            LocalOfficeManager.Builder builder = LocalOfficeManager.builder();
            if (officeHome != null && !officeHome.isBlank()) {
                builder.officeHome(officeHome.trim());
            }
            LocalOfficeManager manager = builder.install().build();
            manager.start();
            officeManager = manager;
            log.info("LibreOffice conversion manager started.");
        } catch (Exception e) {
            officeManager = null;
            throw conversionFailed(originalName, e);
        }
    }

    private BadRequestException conversionFailed(String originalName, Exception e) {
        return new BadRequestException(
                "Could not convert \"" + originalName + "\" to PDF. Please install LibreOffice or configure "
                        + "DOCUMENT_CONVERSION_OFFICE_HOME. Detail: " + e.getMessage());
    }

    @PreDestroy
    public void shutdown() {
        LocalOfficeManager manager = officeManager;
        officeManager = null;
        if (manager == null) return;
        try {
            manager.stop();
        } catch (OfficeException ignored) {
        }
    }

    private void deleteQuietly(Path path) {
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }
}
