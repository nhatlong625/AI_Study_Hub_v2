package com.aistudyhub.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.http.codec.ClientCodecConfigurer;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import com.aistudyhub.service.AiProviderConfigService;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebClientConfig {
    private static final int MAX_FILE_BUFFER_BYTES = 50 * 1024 * 1024;
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final int READ_WRITE_TIMEOUT_SECONDS = 60;
    private static final String INTERNAL_API_KEY_HEADER = "X-Internal-API-Key";

    @Bean
    public WebClient rawPythonAiWebClient(
            @Value("${ai.python-service.base-url}") String baseUrl,
            @Value("${ai.python-service.internal-api-key:}") String internalApiKey) {
        return baseBuilder(baseUrl)
                .filter(internalApiKeyFilter(internalApiKey))
                .build();
    }

    @Bean
    public WebClient pythonAiWebClient(
            @Value("${ai.python-service.base-url}") String baseUrl,
            @Value("${ai.python-service.internal-api-key:}") String internalApiKey,
            AiProviderConfigService aiProviderConfigService) {
        return baseBuilder(baseUrl)
                .filter(internalApiKeyFilter(internalApiKey))
                .filter((request, next) -> {
                    ClientRequest configured = ClientRequest.from(request)
                            .headers(aiProviderConfigService::applyRuntimeHeaders)
                            .build();
                    return next.exchange(configured);
                })
                .build();
    }

    @Bean
    public WebClient supabaseWebClient(@Value("${supabase.url}") String baseUrl) {
        return baseBuilder(baseUrl)
                .codecs(this::configureFileBuffer)
                .build();
    }

    @Bean
    public WebClient payosWebClient() {
        return baseBuilder("https://api-merchant.payos.vn").build();
    }

    private void configureFileBuffer(ClientCodecConfigurer codecs) {
        codecs.defaultCodecs().maxInMemorySize(MAX_FILE_BUFFER_BYTES);
    }

    private WebClient.Builder baseBuilder(String baseUrl) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, CONNECT_TIMEOUT_MS)
                .responseTimeout(Duration.ofSeconds(READ_WRITE_TIMEOUT_SECONDS))
                .doOnConnected(connection -> connection
                        .addHandlerLast(new ReadTimeoutHandler(READ_WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(READ_WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)));

        return WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient));
    }

    private org.springframework.web.reactive.function.client.ExchangeFilterFunction internalApiKeyFilter(String internalApiKey) {
        return (request, next) -> {
            if (internalApiKey == null || internalApiKey.isBlank()) {
                return next.exchange(request);
            }
            ClientRequest configured = ClientRequest.from(request)
                    .header(INTERNAL_API_KEY_HEADER, internalApiKey.trim())
                    .build();
            return next.exchange(configured);
        };
    }
}
