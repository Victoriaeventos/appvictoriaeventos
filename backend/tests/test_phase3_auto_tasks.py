"""
Phase 3 Tests: Sistema de tareas automáticas por servicios contratados
Tests for auto task generation, recalculation, and Phase 3 task fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://victoria-weddings.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "info@victoriaeventos.com"
TEST_PASSWORD = "Victoria2024"

# Test event with all 5 services active
TEST_EVENT_ID = "cc024287-1485-4522-9d30-93dde8b821c4"  # Comunion Leonor


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestPhase3Authentication:
    """Test login with provided credentials"""
    
    def test_login_success(self):
        """Test login with info@victoriaeventos.com / Victoria2024"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "planner"


class TestPhase3EventServices:
    """Test event has all 5 services active"""
    
    def test_event_has_all_services(self, api_client):
        """Verify Comunion Leonor has all 5 services active"""
        response = api_client.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        event = response.json()
        assert event["title"] == "Comunion Leonor"
        assert event["service_asesoria"] == True
        assert event["service_coordinacion"] == True
        assert event["service_decoracion"] == True
        assert event["service_carteleria"] == True
        assert event["service_proveedores"] == True
        
    def test_event_has_dates(self, api_client):
        """Verify event has date and contract_date for offset calculation"""
        response = api_client.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        event = response.json()
        assert event["date"] is not None
        assert event["contract_date"] is not None


class TestPhase3GenerateTasks:
    """Test POST /api/events/{event_id}/generate-tasks endpoint"""
    
    def test_generate_tasks_endpoint(self, api_client):
        """Test task generation creates 62 tasks for all 5 services"""
        response = api_client.post(f"{BASE_URL}/api/events/{TEST_EVENT_ID}/generate-tasks")
        assert response.status_code == 200
        
        data = response.json()
        assert "created" in data
        assert "deleted_previous" in data
        assert "message" in data
        assert data["created"] == 62  # 11+12+12+11+16 tasks from PLANTILLAS_TAREAS
        
    def test_generate_tasks_preserves_manual(self, api_client):
        """Verify manual tasks are not deleted during regeneration"""
        # Get tasks before
        response = api_client.get(f"{BASE_URL}/api/tasks/{TEST_EVENT_ID}")
        tasks_before = response.json()
        manual_before = [t for t in tasks_before if t.get("origen") != "automatica"]
        
        # Regenerate
        api_client.post(f"{BASE_URL}/api/events/{TEST_EVENT_ID}/generate-tasks")
        
        # Get tasks after
        response = api_client.get(f"{BASE_URL}/api/tasks/{TEST_EVENT_ID}")
        tasks_after = response.json()
        manual_after = [t for t in tasks_after if t.get("origen") != "automatica"]
        
        # Manual tasks should be preserved
        assert len(manual_after) == len(manual_before)


class TestPhase3RecalculateDates:
    """Test POST /api/events/{event_id}/recalculate-dates endpoint"""
    
    def test_recalculate_dates_endpoint(self, api_client):
        """Test date recalculation for automatic tasks"""
        response = api_client.post(f"{BASE_URL}/api/events/{TEST_EVENT_ID}/recalculate-dates")
        assert response.status_code == 200
        
        data = response.json()
        assert "updated" in data
        assert "message" in data
        assert data["updated"] == 62  # All auto tasks should be updated


class TestPhase3TaskFields:
    """Test GET /api/tasks/{event_id} returns Phase 3 fields"""
    
    def test_tasks_have_phase3_fields(self, api_client):
        """Verify tasks have servicio, fase, origen, disparador, offset_pct"""
        response = api_client.get(f"{BASE_URL}/api/tasks/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        tasks = response.json()
        assert len(tasks) >= 62  # At least 62 auto tasks
        
        # Check auto tasks have Phase 3 fields
        auto_tasks = [t for t in tasks if t.get("origen") == "automatica"]
        assert len(auto_tasks) == 62
        
        for task in auto_tasks:
            assert "servicio" in task
            assert task["servicio"] in ["asesoria", "coordinacion", "decoracion", "carteleria", "proveedores"]
            assert "fase" in task
            assert task["fase"] != ""
            assert "origen" in task
            assert task["origen"] == "automatica"
            assert "disparador" in task
            assert "offset_pct" in task
            assert task["offset_pct"] is not None
            assert 0 <= task["offset_pct"] <= 1.0
            
    def test_tasks_grouped_by_service(self, api_client):
        """Verify tasks are distributed across all 5 services"""
        response = api_client.get(f"{BASE_URL}/api/tasks/{TEST_EVENT_ID}")
        tasks = response.json()
        
        auto_tasks = [t for t in tasks if t.get("origen") == "automatica"]
        
        # Count by service
        service_counts = {}
        for task in auto_tasks:
            svc = task.get("servicio")
            service_counts[svc] = service_counts.get(svc, 0) + 1
            
        # All 5 services should have tasks
        assert "asesoria" in service_counts
        assert "coordinacion" in service_counts
        assert "decoracion" in service_counts
        assert "carteleria" in service_counts
        assert "proveedores" in service_counts
        
        # Expected counts from PLANTILLAS_TAREAS
        assert service_counts["asesoria"] == 11
        assert service_counts["coordinacion"] == 12
        assert service_counts["decoracion"] == 12
        assert service_counts["carteleria"] == 11
        assert service_counts["proveedores"] == 16
        
    def test_manual_tasks_have_origen_manual(self, api_client):
        """Verify manual tasks have origen='manual'"""
        response = api_client.get(f"{BASE_URL}/api/tasks/{TEST_EVENT_ID}")
        tasks = response.json()
        
        manual_tasks = [t for t in tasks if t.get("origen") != "automatica"]
        
        for task in manual_tasks:
            assert task.get("origen") == "manual" or task.get("origen") == ""


class TestPhase3TaskDueDates:
    """Test offset_pct formula calculates due dates correctly"""
    
    def test_due_dates_within_event_range(self, api_client):
        """Verify all due dates are between contract_date and event_date"""
        # Get event dates
        event_response = api_client.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        event = event_response.json()
        contract_date = event["contract_date"]
        event_date = event["date"]
        
        # Get tasks
        response = api_client.get(f"{BASE_URL}/api/tasks/{TEST_EVENT_ID}")
        tasks = response.json()
        
        auto_tasks = [t for t in tasks if t.get("origen") == "automatica"]
        
        for task in auto_tasks:
            due_date = task.get("due_date")
            assert due_date is not None
            assert due_date >= contract_date, f"Task {task['title']} due_date {due_date} is before contract_date {contract_date}"
            assert due_date <= event_date, f"Task {task['title']} due_date {due_date} is after event_date {event_date}"


class TestPhase3TotalTaskCount:
    """Test total task count matches expected"""
    
    def test_total_tasks_count(self, api_client):
        """Verify total tasks = 62 auto + 18 manual = 80"""
        response = api_client.get(f"{BASE_URL}/api/tasks/{TEST_EVENT_ID}")
        tasks = response.json()
        
        auto_count = len([t for t in tasks if t.get("origen") == "automatica"])
        manual_count = len([t for t in tasks if t.get("origen") != "automatica"])
        
        assert auto_count == 62
        assert manual_count == 18
        assert len(tasks) == 80


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
