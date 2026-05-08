"""
Test suite for Phase 1+2 features:
- Dashboard stats with countdown and pending payments
- Reminders API endpoint
- Tasks, events CRUD operations
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "planner@test.com"
TEST_PASSWORD = "test1234"


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid planner credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "planner"
        print(f"Login successful for {TEST_EMAIL}")

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("Invalid login correctly rejected")


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for planner user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Auth failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardStats:
    """Dashboard stats endpoint tests - Phase 1+2 features"""
    
    def test_dashboard_stats_endpoint(self, auth_headers):
        """Test /api/dashboard/stats returns expected fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        # Phase 1 original fields
        assert "total_events" in data
        assert "upcoming_events" in data
        assert "total_tasks" in data
        assert "completed_tasks" in data
        assert "pending_tasks" in data
        assert "overdue_tasks" in data
        
        # Phase 2 new fields - Cuenta Atrás and Pagos Pend.
        assert "nearest_countdown" in data, "Missing nearest_countdown field (Cuenta Atrás)"
        assert "total_pending_payments" in data, "Missing total_pending_payments field (Pagos Pend.)"
        assert "upcoming_payments" in data, "Missing upcoming_payments array"
        
        print(f"Dashboard stats: {data['total_events']} events, countdown: {data['nearest_countdown']}, pending payments: {data['total_pending_payments']}")

    def test_dashboard_stats_data_types(self, auth_headers):
        """Verify data types of dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check data types
        assert isinstance(data["total_events"], int)
        assert isinstance(data["upcoming_events"], int)
        assert isinstance(data["total_tasks"], int)
        assert isinstance(data["overdue_tasks"], int)
        assert isinstance(data["total_pending_payments"], (int, float))
        assert isinstance(data["upcoming_payments"], list)
        
        # Countdown can be null if no upcoming events
        if data["nearest_countdown"] is not None:
            assert isinstance(data["nearest_countdown"], int)
        
        print("Dashboard stats data types verified")


class TestReminders:
    """Reminders endpoint tests - Phase 2 feature"""
    
    def test_reminders_endpoint(self, auth_headers):
        """Test /api/reminders endpoint exists and returns array"""
        response = requests.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        assert response.status_code == 200, f"Reminders failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Reminders should return array"
        print(f"Reminders endpoint returned {len(data)} reminders")
    
    def test_reminder_structure(self, auth_headers):
        """Verify reminder objects have expected structure"""
        response = requests.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            reminder = data[0]
            assert "type" in reminder, "Reminder missing 'type' field"
            assert "message" in reminder, "Reminder missing 'message' field"
            assert "event_id" in reminder, "Reminder missing 'event_id' field"
            assert reminder["type"] in ["urgent", "warning", "info"], f"Invalid reminder type: {reminder['type']}"
            print(f"First reminder: {reminder['type']} - {reminder['message']}")
        else:
            print("No reminders to validate structure")


class TestEvents:
    """Events CRUD tests"""
    
    def test_get_events_list(self, auth_headers):
        """Test fetching events list"""
        response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        assert response.status_code == 200, f"Get events failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} events")
        
        # Find Boda García event
        boda_garcia = next((e for e in data if "García" in e.get("title", "")), None)
        if boda_garcia:
            print(f"Found test event: {boda_garcia['title']}, date: {boda_garcia['date']}")
            return boda_garcia["id"]
        return None
    
    def test_get_event_detail(self, auth_headers):
        """Test fetching event detail"""
        # First get events list
        response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        assert response.status_code == 200
        events = response.json()
        
        if len(events) > 0:
            event_id = events[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/events/{event_id}", headers=auth_headers)
            assert detail_response.status_code == 200
            event = detail_response.json()
            assert "id" in event
            assert "title" in event
            assert "date" in event
            print(f"Event detail fetched: {event['title']}")


class TestTasks:
    """Tasks endpoint tests - for Timeline and Weekly Summary features"""
    
    def test_get_event_tasks(self, auth_headers):
        """Test fetching tasks for an event"""
        # Get events first
        events_response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        assert events_response.status_code == 200
        events = events_response.json()
        
        if len(events) > 0:
            event_id = events[0]["id"]
            tasks_response = requests.get(f"{BASE_URL}/api/tasks/{event_id}", headers=auth_headers)
            assert tasks_response.status_code == 200, f"Get tasks failed: {tasks_response.text}"
            tasks = tasks_response.json()
            assert isinstance(tasks, list)
            print(f"Found {len(tasks)} tasks for event")
            
            if len(tasks) > 0:
                task = tasks[0]
                assert "title" in task
                assert "status" in task
                assert "due_date" in task
                print(f"First task: {task['title']}, status: {task['status']}, due: {task['due_date']}")


class TestEventStats:
    """Event-specific stats tests - used by Timeline and Weekly Summary"""
    
    def test_get_event_stats(self, auth_headers):
        """Test fetching stats for a specific event"""
        # Get events first
        events_response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        assert events_response.status_code == 200
        events = events_response.json()
        
        if len(events) > 0:
            event_id = events[0]["id"]
            stats_response = requests.get(f"{BASE_URL}/api/stats/{event_id}", headers=auth_headers)
            assert stats_response.status_code == 200, f"Get stats failed: {stats_response.text}"
            stats = stats_response.json()
            
            # Check structure
            assert "guests" in stats
            assert "budget" in stats
            assert "tasks" in stats
            
            # Check tasks stats for weekly summary
            tasks_stats = stats["tasks"]
            assert "total" in tasks_stats
            assert "completed" in tasks_stats
            assert "pending" in tasks_stats
            print(f"Event stats: {tasks_stats['completed']}/{tasks_stats['total']} tasks completed")


class TestSuppliers:
    """Suppliers tests - for pending payments calculation"""
    
    def test_get_event_suppliers(self, auth_headers):
        """Test fetching suppliers for an event"""
        events_response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        assert events_response.status_code == 200
        events = events_response.json()
        
        if len(events) > 0:
            event_id = events[0]["id"]
            suppliers_response = requests.get(f"{BASE_URL}/api/suppliers/{event_id}", headers=auth_headers)
            assert suppliers_response.status_code == 200
            suppliers = suppliers_response.json()
            assert isinstance(suppliers, list)
            print(f"Found {len(suppliers)} suppliers for event")
            
            # Check if any have pending payments
            pending = [s for s in suppliers if s.get("price", 0) > s.get("advance_payment", 0)]
            print(f"{len(pending)} suppliers with pending payments")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
