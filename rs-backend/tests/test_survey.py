from typing import Any

import pytest
from fastapi.testclient import TestClient


def test_submit_survey(client: TestClient) -> None:
    """Test submitting a survey response."""
    response = client.post(
        "/survey/",
        json={
            "q_did_you_set_a_cfm_goal": "yes",
            "q_did_you_make_progress_this_week": "no",
            "organization": "relief society",
        },
    )
    assert response.status_code == 200
    data: dict[str, Any] = response.json()
    assert "message" in data
    assert data["status"] == "ok"
    
    # Verify the survey was actually saved by checking reports
    reports_response = client.get("/survey/reports")
    assert reports_response.status_code == 200
    reports_data: dict[str, Any] = reports_response.json()
    assert reports_data["total_responses"] == 1
    assert reports_data["organization_breakdown"]["relief society"] == 1
    assert reports_data["question_stats"]["q_did_you_set_a_cfm_goal"]["yes"] == 1
    assert reports_data["question_stats"]["q_did_you_set_a_cfm_goal"]["no"] == 0
    assert reports_data["question_stats"]["q_did_you_make_progress_this_week"]["yes"] == 0
    assert reports_data["question_stats"]["q_did_you_make_progress_this_week"]["no"] == 1


def test_submit_survey_invalid_data(client: TestClient) -> None:
    """Test submitting a survey with invalid data."""
    response = client.post(
        "/survey/",
        json={
            "q_did_you_set_a_cfm_goal": "maybe",  # Invalid value
            "q_did_you_make_progress_this_week": "no",
            "organization": "relief society",
        },
    )
    assert response.status_code == 422  # Validation error


def test_get_reports(client: TestClient) -> None:
    """Test getting survey reports."""
    # First submit some surveys
    client.post(
        "/survey/",
        json={
            "q_did_you_set_a_cfm_goal": "yes",
            "q_did_you_make_progress_this_week": "yes",
            "organization": "relief society",
        },
    )
    client.post(
        "/survey/",
        json={
            "q_did_you_set_a_cfm_goal": "no",
            "q_did_you_make_progress_this_week": "yes",
            "organization": "elders quorum",
        },
    )
    client.post(
        "/survey/",
        json={
            "q_did_you_set_a_cfm_goal": "yes",
            "q_did_you_make_progress_this_week": "no",
            "organization": "relief society",
        },
    )
    
    # Then get reports
    response = client.get("/survey/reports")
    assert response.status_code == 200
    data: dict[str, Any] = response.json()
    assert "total_responses" in data
    assert "organization_breakdown" in data
    assert "question_stats" in data
    
    # Verify the data is correct
    assert data["total_responses"] == 3
    assert data["organization_breakdown"]["relief society"] == 2
    assert data["organization_breakdown"]["elders quorum"] == 1
    assert data["question_stats"]["q_did_you_set_a_cfm_goal"]["yes"] == 2
    assert data["question_stats"]["q_did_you_set_a_cfm_goal"]["no"] == 1
    assert data["question_stats"]["q_did_you_make_progress_this_week"]["yes"] == 2
    assert data["question_stats"]["q_did_you_make_progress_this_week"]["no"] == 1


def test_get_reports_structure(client: TestClient) -> None:
    """Test that reports have the correct structure."""
    response = client.get("/survey/reports")
    assert response.status_code == 200
    data: dict[str, Any] = response.json()
    assert isinstance(data["total_responses"], int)
    assert isinstance(data["organization_breakdown"], dict)
    assert isinstance(data["question_stats"], dict)
    
    # Verify question_stats structure
    assert "q_did_you_set_a_cfm_goal" in data["question_stats"]
    assert "q_did_you_make_progress_this_week" in data["question_stats"]
    assert isinstance(data["question_stats"]["q_did_you_set_a_cfm_goal"], dict)
    assert isinstance(data["question_stats"]["q_did_you_make_progress_this_week"], dict)


def test_survey_endpoints_comprehensive_calculations(client: TestClient) -> None:
    """
    Comprehensive functional test for POST and GET survey endpoints.
    
    Submits multiple survey responses and verifies that all report calculations
    are correct, including organization breakdowns and question statistics.
    """
    # Define test survey responses with expected outcomes
    survey_responses = [
        {
            "q_did_you_set_a_cfm_goal": "yes",
            "q_did_you_make_progress_this_week": "yes",
            "organization": "relief society",
        },
        {
            "q_did_you_set_a_cfm_goal": "yes",
            "q_did_you_make_progress_this_week": "no",
            "organization": "relief society",
        },
        {
            "q_did_you_set_a_cfm_goal": "no",
            "q_did_you_make_progress_this_week": "yes",
            "organization": "elders quorum",
        },
        {
            "q_did_you_set_a_cfm_goal": "yes",
            "q_did_you_make_progress_this_week": "yes",
            "organization": "elders quorum",
        },
        {
            "q_did_you_set_a_cfm_goal": "no",
            "q_did_you_make_progress_this_week": "no",
            "organization": "young mens",
        },
        {
            "q_did_you_set_a_cfm_goal": "yes",
            "q_did_you_make_progress_this_week": "yes",
            "organization": "young womens",
        },
    ]
    
    # Submit all survey responses via POST endpoint
    for survey in survey_responses:
        response = client.post("/survey/", json=survey)
        assert response.status_code == 200, f"Failed to submit survey: {survey}"
        data: dict[str, Any] = response.json()
        assert data["status"] == "ok"
        assert "message" in data
    
    # Verify we submitted the expected number
    assert len(survey_responses) == 6
    
    # Get reports via GET endpoint
    reports_response = client.get("/survey/reports")
    assert reports_response.status_code == 200
    reports_data: dict[str, Any] = reports_response.json()
    
    # Verify total_responses
    assert reports_data["total_responses"] == 6, "Total responses should be 6"
    
    # Verify organization_breakdown
    # Expected: relief society: 2, elders quorum: 2, young mens: 1, young womens: 1
    org_breakdown = reports_data["organization_breakdown"]
    assert org_breakdown["relief society"] == 2, "Relief society should have 2 responses"
    assert org_breakdown["elders quorum"] == 2, "Elders quorum should have 2 responses"
    assert org_breakdown["young mens"] == 1, "Young mens should have 1 response"
    assert org_breakdown["young womens"] == 1, "Young womens should have 1 response"
    assert sum(org_breakdown.values()) == 6, "Sum of organization breakdown should equal total responses"
    
    # Verify overall question_stats
    question_stats = reports_data["question_stats"]
    
    # q_did_you_set_a_cfm_goal: yes=4, no=2
    cfm_goal_stats = question_stats["q_did_you_set_a_cfm_goal"]
    assert cfm_goal_stats["yes"] == 4, "CFM goal yes should be 4"
    assert cfm_goal_stats["no"] == 2, "CFM goal no should be 2"
    assert sum(cfm_goal_stats.values()) == 6, "Sum of CFM goal stats should equal total responses"
    
    # q_did_you_make_progress_this_week: yes=4, no=2
    progress_stats = question_stats["q_did_you_make_progress_this_week"]
    assert progress_stats["yes"] == 4, "Progress yes should be 4"
    assert progress_stats["no"] == 2, "Progress no should be 2"
    assert sum(progress_stats.values()) == 6, "Sum of progress stats should equal total responses"
    
    # Verify question_stats_by_org
    question_stats_by_org = reports_data["question_stats_by_org"]
    
    # Verify structure exists for both questions
    assert "q_did_you_set_a_cfm_goal" in question_stats_by_org
    assert "q_did_you_make_progress_this_week" in question_stats_by_org
    
    # Verify q_did_you_set_a_cfm_goal by organization
    cfm_goal_by_org = question_stats_by_org["q_did_you_set_a_cfm_goal"]
    
    # Relief society: yes=2, no=0
    assert "relief society" in cfm_goal_by_org
    assert cfm_goal_by_org["relief society"]["yes"] == 2
    assert cfm_goal_by_org["relief society"]["no"] == 0
    
    # Elders quorum: yes=1, no=1
    assert "elders quorum" in cfm_goal_by_org
    assert cfm_goal_by_org["elders quorum"]["yes"] == 1
    assert cfm_goal_by_org["elders quorum"]["no"] == 1
    
    # Young mens: yes=0, no=1
    assert "young mens" in cfm_goal_by_org
    assert cfm_goal_by_org["young mens"]["yes"] == 0
    assert cfm_goal_by_org["young mens"]["no"] == 1
    
    # Young womens: yes=1, no=0
    assert "young womens" in cfm_goal_by_org
    assert cfm_goal_by_org["young womens"]["yes"] == 1
    assert cfm_goal_by_org["young womens"]["no"] == 0
    
    # Verify q_did_you_make_progress_this_week by organization
    progress_by_org = question_stats_by_org["q_did_you_make_progress_this_week"]
    
    # Relief society: yes=1, no=1
    assert "relief society" in progress_by_org
    assert progress_by_org["relief society"]["yes"] == 1
    assert progress_by_org["relief society"]["no"] == 1
    
    # Elders quorum: yes=2, no=0
    assert "elders quorum" in progress_by_org
    assert progress_by_org["elders quorum"]["yes"] == 2
    assert progress_by_org["elders quorum"]["no"] == 0
    
    # Young mens: yes=0, no=1
    assert "young mens" in progress_by_org
    assert progress_by_org["young mens"]["yes"] == 0
    assert progress_by_org["young mens"]["no"] == 1
    
    # Young womens: yes=1, no=0
    assert "young womens" in progress_by_org
    assert progress_by_org["young womens"]["yes"] == 1
    assert progress_by_org["young womens"]["no"] == 0
    
    # Cross-verify: sum of all org stats should equal overall stats
    total_cfm_yes = sum(org["yes"] for org in cfm_goal_by_org.values())
    total_cfm_no = sum(org["no"] for org in cfm_goal_by_org.values())
    assert total_cfm_yes == cfm_goal_stats["yes"], "Sum of CFM yes by org should equal overall yes"
    assert total_cfm_no == cfm_goal_stats["no"], "Sum of CFM no by org should equal overall no"
    
    total_progress_yes = sum(org["yes"] for org in progress_by_org.values())
    total_progress_no = sum(org["no"] for org in progress_by_org.values())
    assert total_progress_yes == progress_stats["yes"], "Sum of progress yes by org should equal overall yes"
    assert total_progress_no == progress_stats["no"], "Sum of progress no by org should equal overall no"
