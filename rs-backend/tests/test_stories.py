from typing import Any

from fastapi.testclient import TestClient


def test_post_story(client: TestClient) -> None:
    """Test posting a story."""
    response = client.post(
        "/stories/",
        json={"content": "This is a test story."},
    )
    assert response.status_code == 200
    data: dict[str, Any] = response.json()
    assert "datetime_submitted" in data
    assert "content" in data
    assert data["content"] == "This is a test story."
    # Verify datetime format: YYYY-MM-DD HH:MM:SS UTC
    assert " UTC" in data["datetime_submitted"]
    assert len(data["datetime_submitted"]) == 23  # Format: "YYYY-MM-DD HH:MM:SS UTC"
    
    # Verify the story was actually saved by checking get_stories
    get_response = client.get("/stories/")
    assert get_response.status_code == 200
    stories: list[dict[str, Any]] = get_response.json()
    assert len(stories) >= 1
    assert any(s["content"] == "This is a test story." for s in stories)


def test_post_story_empty_content(client: TestClient) -> None:
    """Test posting a story with empty content."""
    response = client.post(
        "/stories/",
        json={"content": ""},
    )
    # Empty content should be accepted (no validation error)
    assert response.status_code == 200
    data: dict[str, Any] = response.json()
    assert data["content"] == ""


def test_get_stories(client: TestClient) -> None:
    """Test getting all stories."""
    # Post a few stories first
    client.post("/stories/", json={"content": "First story"})
    client.post("/stories/", json={"content": "Second story"})
    client.post("/stories/", json={"content": "Third story"})
    
    # Get all stories
    response = client.get("/stories/")
    assert response.status_code == 200
    data: list[dict[str, Any]] = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    
    # Verify all stories are returned
    contents = [story["content"] for story in data]
    assert "First story" in contents
    assert "Second story" in contents
    assert "Third story" in contents
    
    # Verify structure
    for story in data:
        assert "datetime_submitted" in story
        assert "content" in story


def test_get_stories_structure(client: TestClient) -> None:
    """Test that stories have the correct structure."""
    # Post a story to ensure we have data
    client.post("/stories/", json={"content": "Test story for structure"})
    
    response = client.get("/stories/")
    assert response.status_code == 200
    data: list[dict[str, Any]] = response.json()
    assert isinstance(data, list)
    for story in data:
        assert "datetime_submitted" in story
        assert "content" in story
        assert isinstance(story["datetime_submitted"], str)
        assert isinstance(story["content"], str)
        # Verify datetime format
        assert " UTC" in story["datetime_submitted"]


def test_post_multiple_stories_and_retrieve(client: TestClient) -> None:
    """Test posting multiple stories and retrieving them."""
    # Post multiple stories
    story_contents = [
        "Story one",
        "Story two",
        "Story three",
    ]
    
    for content in story_contents:
        response = client.post("/stories/", json={"content": content})
        assert response.status_code == 200
    
    # Retrieve all stories
    response = client.get("/stories/")
    assert response.status_code == 200
    stories: list[dict[str, Any]] = response.json()
    
    # Verify all stories are present
    retrieved_contents = [s["content"] for s in stories]
    for content in story_contents:
        assert content in retrieved_contents


def test_stories_persist_across_requests(client: TestClient) -> None:
    """Test that stories persist across multiple requests."""
    # Post a story
    post_response = client.post("/stories/", json={"content": "Persistent story"})
    assert post_response.status_code == 200
    
    # Get stories in first request
    get_response1 = client.get("/stories/")
    assert get_response1.status_code == 200
    stories1: list[dict[str, Any]] = get_response1.json()
    assert any(s["content"] == "Persistent story" for s in stories1)
    
    # Get stories in second request (should still be there)
    get_response2 = client.get("/stories/")
    assert get_response2.status_code == 200
    stories2: list[dict[str, Any]] = get_response2.json()
    assert any(s["content"] == "Persistent story" for s in stories2)
