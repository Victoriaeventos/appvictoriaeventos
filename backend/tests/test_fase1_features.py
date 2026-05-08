"""
FASE 1 Backend Tests - Victoria Eventos
Tests for the new Command Center dashboard and task management features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://victoria-weddings.preview.emergentagent.com')

# Test credentials
PLANNER_EMAIL = "info@victoriaeventos.com"
PLANNER_PASSWORD = "Victoria2024"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for planner"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": PLANNER_EMAIL, "password": PLANNER_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestLogin:
    """Test authentication with planner credentials"""
    
    def test_login_success(self):
        """Test login with valid planner credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PLANNER_EMAIL, "password": PLANNER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == PLANNER_EMAIL
        assert data["user"]["role"] == "planner"


class TestCommandCenter:
    """Test the new Command Center dashboard endpoint"""
    
    def test_command_center_endpoint_exists(self, auth_headers):
        """Test that /api/dashboard/command-center endpoint exists and returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_command_center_returns_hoy_section(self, auth_headers):
        """Test that command-center returns 'hoy' (HOY TENGO QUE HACER ESTO) section"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        data = response.json()
        assert "hoy" in data
        assert isinstance(data["hoy"], list)
        # Should return max 6 tasks
        assert len(data["hoy"]) <= 6
    
    def test_command_center_returns_bloqueos_section(self, auth_headers):
        """Test that command-center returns 'bloqueos' (BLOQUEOS) section"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        data = response.json()
        assert "bloqueos" in data
        assert isinstance(data["bloqueos"], list)
    
    def test_command_center_returns_aprobaciones_section(self, auth_headers):
        """Test that command-center returns 'aprobaciones' (APROBACIONES PENDIENTES) section"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        data = response.json()
        assert "aprobaciones" in data
        assert isinstance(data["aprobaciones"], list)
    
    def test_command_center_returns_pagos_revisar_section(self, auth_headers):
        """Test that command-center returns 'pagos_revisar' (PAGOS A REVISAR) section"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        data = response.json()
        assert "pagos_revisar" in data
        assert isinstance(data["pagos_revisar"], list)
        # Check pagos have euro amounts
        if len(data["pagos_revisar"]) > 0:
            pago = data["pagos_revisar"][0]
            assert "remaining" in pago
            assert "estimated_amount" in pago
            assert "paid_amount" in pago
    
    def test_command_center_returns_que_hago_hoy_section(self, auth_headers):
        """Test that command-center returns 'que_hago_hoy' (¿Qué hago hoy?) section"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        data = response.json()
        assert "que_hago_hoy" in data
        assert isinstance(data["que_hago_hoy"], list)
        # Should return max 3 tasks
        assert len(data["que_hago_hoy"]) <= 3
    
    def test_command_center_tasks_have_priority(self, auth_headers):
        """Test that tasks in command-center have auto-calculated priority"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        data = response.json()
        if len(data["hoy"]) > 0:
            task = data["hoy"][0]
            assert "priority" in task
            assert task["priority"] in ["alta", "media", "baja"]
    
    def test_command_center_tasks_have_event_title(self, auth_headers):
        """Test that tasks in command-center include event_title"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        data = response.json()
        if len(data["hoy"]) > 0:
            task = data["hoy"][0]
            assert "event_title" in task


class TestTaskStatuses:
    """Test the new task status values"""
    
    def test_get_tasks_returns_normalized_status(self, auth_headers):
        """Test that tasks endpoint returns normalized status values"""
        # First get events
        events_response = requests.get(
            f"{BASE_URL}/api/events",
            headers=auth_headers
        )
        events = events_response.json()
        assert len(events) > 0
        
        # Get tasks for first event
        event_id = events[0]["id"]
        tasks_response = requests.get(
            f"{BASE_URL}/api/tasks/{event_id}",
            headers=auth_headers
        )
        assert tasks_response.status_code == 200
        tasks = tasks_response.json()
        
        # Check that status values are normalized (not old 'pending', 'completed')
        valid_statuses = [
            "pendiente", "en_proceso", "esperando_cliente", 
            "esperando_proveedor", "aprobacion_pendiente", "completada"
        ]
        for task in tasks:
            assert task["status"] in valid_statuses, f"Invalid status: {task['status']}"
    
    def test_tasks_have_auto_priority(self, auth_headers):
        """Test that tasks have auto-calculated priority"""
        events_response = requests.get(
            f"{BASE_URL}/api/events",
            headers=auth_headers
        )
        events = events_response.json()
        event_id = events[0]["id"]
        
        tasks_response = requests.get(
            f"{BASE_URL}/api/tasks/{event_id}",
            headers=auth_headers
        )
        tasks = tasks_response.json()
        
        for task in tasks:
            assert "priority" in task
            assert task["priority"] in ["alta", "media", "baja"]
    
    def test_update_task_status(self, auth_headers):
        """Test updating a task status to new status values"""
        # Get events and tasks
        events_response = requests.get(
            f"{BASE_URL}/api/events",
            headers=auth_headers
        )
        events = events_response.json()
        event_id = events[0]["id"]
        
        tasks_response = requests.get(
            f"{BASE_URL}/api/tasks/{event_id}",
            headers=auth_headers
        )
        tasks = tasks_response.json()
        
        # Find a non-completed task
        task_to_update = None
        for task in tasks:
            if task["status"] != "completada":
                task_to_update = task
                break
        
        if task_to_update:
            # Update to esperando_proveedor
            update_response = requests.put(
                f"{BASE_URL}/api/tasks/{task_to_update['id']}",
                headers=auth_headers,
                json={
                    "title": task_to_update["title"],
                    "category": task_to_update["category"],
                    "due_date": task_to_update["due_date"],
                    "responsible": task_to_update["responsible"],
                    "status": "esperando_proveedor",
                    "notes": task_to_update.get("notes", ""),
                    "event_id": event_id
                }
            )
            assert update_response.status_code == 200
            updated_task = update_response.json()
            assert updated_task["status"] == "esperando_proveedor"
            
            # Revert back to original status
            requests.put(
                f"{BASE_URL}/api/tasks/{task_to_update['id']}",
                headers=auth_headers,
                json={
                    "title": task_to_update["title"],
                    "category": task_to_update["category"],
                    "due_date": task_to_update["due_date"],
                    "responsible": task_to_update["responsible"],
                    "status": task_to_update["status"],
                    "notes": task_to_update.get("notes", ""),
                    "event_id": event_id
                }
            )


class TestPriorityCalculation:
    """Test the auto-priority calculation logic"""
    
    def test_overdue_tasks_have_alta_priority(self, auth_headers):
        """Test that overdue tasks get 'alta' priority"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/command-center",
            headers=auth_headers
        )
        data = response.json()
        
        # Check hoy section - overdue tasks should be alta
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        for task in data["hoy"]:
            if task["due_date"] < today and task["status"] != "completada":
                assert task["priority"] == "alta", f"Overdue task should be alta: {task['title']}"
    
    def test_completed_tasks_have_baja_priority(self, auth_headers):
        """Test that completed tasks get 'baja' priority"""
        events_response = requests.get(
            f"{BASE_URL}/api/events",
            headers=auth_headers
        )
        events = events_response.json()
        event_id = events[0]["id"]
        
        tasks_response = requests.get(
            f"{BASE_URL}/api/tasks/{event_id}",
            headers=auth_headers
        )
        tasks = tasks_response.json()
        
        for task in tasks:
            if task["status"] == "completada":
                assert task["priority"] == "baja", f"Completed task should be baja: {task['title']}"


class TestEvents:
    """Test events endpoint"""
    
    def test_get_events(self, auth_headers):
        """Test getting all events for planner"""
        response = requests.get(
            f"{BASE_URL}/api/events",
            headers=auth_headers
        )
        assert response.status_code == 200
        events = response.json()
        assert isinstance(events, list)
        assert len(events) > 0
        
        # Check event structure
        event = events[0]
        assert "id" in event
        assert "title" in event
        assert "date" in event
        assert "event_type" in event


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
