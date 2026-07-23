from fastapi.testclient import TestClient

from main import app


def test_health_check():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert isinstance(data["llm_provider"], str)
    assert isinstance(data["llm_provider_order"], list)
