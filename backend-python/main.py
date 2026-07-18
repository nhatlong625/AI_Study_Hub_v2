from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from src.api.document_routes import router as document_router
from src.api.quiz_routes import router as quiz_router
from src.api.routes import router as chat_router
from src.core.config import get_settings
from src.core.runtime_ai_config import reset_runtime_ai_config, set_runtime_ai_config
from src.llm.llm_client import GeminiService

settings = get_settings()


def configured_cors_origins() -> list[str]:
    return [
        origin.strip()
        for origin in settings.cors_origins.split(",")
        if origin.strip()
    ]


app = FastAPI(
    title="AI Study Hub Chat Bot API",
    description="AI generation API: receive study context from Spring Boot and answer with a configured LLM.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def require_internal_api_key(request, call_next):
    internal_api_key = settings.internal_api_key.strip()
    if internal_api_key and request.url.path != "/health":
        provided_key = request.headers.get("x-internal-api-key", "")
        if provided_key != internal_api_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid internal API key."},
            )
    return await call_next(request)


@app.middleware("http")
async def load_runtime_ai_config(request, call_next):
    headers = request.headers
    token = set_runtime_ai_config({
        "provider_order": headers.get("x-ai-provider-order", ""),
        "openai_api_key": headers.get("x-ai-openai-key", ""),
        "openai_model": headers.get("x-ai-openai-model", ""),
        "gemini_api_key": headers.get("x-ai-gemini-key", ""),
        "gemini_model": headers.get("x-ai-gemini-model", ""),
        "deepseek_api_key": headers.get("x-ai-deepseek-key", ""),
        "deepseek_model": headers.get("x-ai-deepseek-model", ""),
        "temperature": headers.get("x-ai-temperature", ""),
        "max_tokens": headers.get("x-ai-max-tokens", ""),
        "top_p": headers.get("x-ai-top-p", ""),
        "system_prompt": headers.get("x-ai-system-prompt", ""),
    })
    try:
        return await call_next(request)
    finally:
        reset_runtime_ai_config(token)


app.include_router(chat_router, prefix="/api/chat", tags=["AI Chat Bot"])
app.include_router(document_router, prefix="/api/documents", tags=["Documents"])
app.include_router(quiz_router, prefix="/api/quiz", tags=["Quiz"])


@app.post("/internal/ai/test", tags=["Internal"])
def test_ai_connection():
    service = GeminiService()
    valid, provider, message = service.test_connection()
    return {
        "valid": valid,
        "provider": provider,
        "message": message[:500],
    }


@app.get("/health", tags=["Health"])
def health_check():
    service = GeminiService()
    return {
        "status": "ok",
        "llm_provider": service.provider,
        "llm_provider_order": service.provider_order,
    }
