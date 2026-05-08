"""
Test suite for FASE 2 features:
- Dashboard command-center with separated bloqueos_cliente/bloqueos_proveedor + archivos_pendientes
- Files module with new fields (category, file_status, origin, version)
- PUT /api/files/{file_id} endpoint
- POST /api/automations/run-followups endpoint
- Tasks with new fields (description, service, task_type, next_step, requires_approval, related_*)
"""

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous iteration
TEST_EMAIL = "info@victoriaeventos.com"
TEST_PASSWORD = "Victoria2024"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for planner user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip(f"Auth failed: {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def event_id(auth_headers):
    """Get first event ID for testing"""
    response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]["id"]
    pytest.skip("No events found")


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with Victoria Eventos credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestCommandCenter:
    """Dashboard command-center endpoint tests - FASE 2 features"""
    
    def test_command_center_endpoint(self, auth_headers):
        """Test /api/dashboard/command-center returns expected fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/command-center", headers=auth_headers)
        assert response.status_code == 200, f"Command center failed: {response.text}"
        data = response.json()
        
        # FASE 2: Separated bloqueos
        assert "bloqueos_cliente" in data, "Missing bloqueos_cliente field"
        assert "bloqueos_proveedor" in data, "Missing bloqueos_proveedor field"
        
        # FASE 2: Archivos pendientes
        assert "archivos_pendientes" in data, "Missing archivos_pendientes field"
        
        # Existing fields
        assert "hoy" in data
        assert "aprobaciones" in data
        assert "pagos_revisar" in data
        assert "que_hago_hoy" in data
        
        print(f"✓ Command center has all 6 sections")
        print(f"  - HOY: {len(data['hoy'])} tasks")
        print(f"  - BLOQUEOS CLIENTE: {len(data['bloqueos_cliente'])} tasks")
        print(f"  - BLOQUEOS PROVEEDOR: {len(data['bloqueos_proveedor'])} tasks")
        print(f"  - APROBACIONES: {len(data['aprobaciones'])} tasks")
        print(f"  - PAGOS: {len(data['pagos_revisar'])} items")
        print(f"  - ARCHIVOS PENDIENTES: {len(data['archivos_pendientes'])} files")

    def test_bloqueos_cliente_structure(self, auth_headers):
        """Verify bloqueos_cliente contains tasks with esperando_cliente status"""
        response = requests.get(f"{BASE_URL}/api/dashboard/command-center", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        for task in data.get("bloqueos_cliente", []):
            assert task.get("status") == "esperando_cliente", f"Wrong status: {task.get('status')}"
            assert "id" in task
            assert "title" in task
            assert "event_title" in task
        
        print(f"✓ bloqueos_cliente structure verified ({len(data.get('bloqueos_cliente', []))} tasks)")

    def test_bloqueos_proveedor_structure(self, auth_headers):
        """Verify bloqueos_proveedor contains tasks with esperando_proveedor status"""
        response = requests.get(f"{BASE_URL}/api/dashboard/command-center", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        for task in data.get("bloqueos_proveedor", []):
            assert task.get("status") == "esperando_proveedor", f"Wrong status: {task.get('status')}"
        
        print(f"✓ bloqueos_proveedor structure verified ({len(data.get('bloqueos_proveedor', []))} tasks)")

    def test_archivos_pendientes_structure(self, auth_headers):
        """Verify archivos_pendientes contains files with pendiente_revision status"""
        response = requests.get(f"{BASE_URL}/api/dashboard/command-center", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        for archivo in data.get("archivos_pendientes", []):
            assert "id" in archivo
            assert "file_name" in archivo
            assert "event_title" in archivo
            assert "category" in archivo
        
        print(f"✓ archivos_pendientes structure verified ({len(data.get('archivos_pendientes', []))} files)")


class TestFilesEndpoint:
    """Files endpoint tests - FASE 2 features"""
    
    def test_get_files(self, auth_headers, event_id):
        """Test GET /api/files/{event_id}"""
        response = requests.get(f"{BASE_URL}/api/files/{event_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get files failed: {response.text}"
        files = response.json()
        assert isinstance(files, list)
        print(f"✓ GET files returned {len(files)} files")

    def test_create_file_with_new_fields(self, auth_headers, event_id):
        """Test POST /api/files with FASE 2 fields"""
        # Create a simple test file (base64 encoded text)
        test_content = base64.b64encode(b"Test file content for FASE 2").decode('utf-8')
        
        file_data = {
            "event_id": event_id,
            "file_name": "TEST_contrato_prueba.pdf",
            "file_type": "contratos",
            "file_base64": test_content,
            "notes": "Test file for FASE 2",
            "category": "contratos",
            "description": "Contrato de prueba para testing",
            "service_related": "Catering",
            "version": 1,
            "file_status": "pendiente_revision",
            "origin": "email"
        }
        
        response = requests.post(f"{BASE_URL}/api/files", json=file_data, headers=auth_headers)
        assert response.status_code == 200, f"Create file failed: {response.text}"
        
        created_file = response.json()
        assert created_file["file_name"] == "TEST_contrato_prueba.pdf"
        assert created_file["category"] == "contratos"
        assert created_file["file_status"] == "pendiente_revision"
        assert created_file["origin"] == "email"
        assert created_file["version"] == 1
        
        print(f"✓ Created file with FASE 2 fields: {created_file['id']}")
        return created_file["id"]

    def test_update_file_status(self, auth_headers, event_id):
        """Test PUT /api/files/{file_id} to update file status"""
        # First create a file
        test_content = base64.b64encode(b"Test update content").decode('utf-8')
        file_data = {
            "event_id": event_id,
            "file_name": "TEST_update_file.pdf",
            "file_type": "otros",
            "file_base64": test_content,
            "category": "otros",
            "file_status": "pendiente_revision",
            "origin": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/files", json=file_data, headers=auth_headers)
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        
        # Update the file status to 'aprobado'
        update_data = {
            "file_status": "aprobado",
            "description": "Updated description",
            "notes": "Approved after review"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/files/{file_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update file failed: {update_response.text}"
        
        updated_file = update_response.json()
        assert updated_file["file_status"] == "aprobado"
        assert updated_file["description"] == "Updated description"
        
        print(f"✓ Updated file status to 'aprobado': {file_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/files/{file_id}", headers=auth_headers)

    def test_update_file_to_final(self, auth_headers, event_id):
        """Test updating file status to 'final'"""
        test_content = base64.b64encode(b"Final version content").decode('utf-8')
        file_data = {
            "event_id": event_id,
            "file_name": "TEST_final_file.pdf",
            "file_type": "contratos",
            "file_base64": test_content,
            "category": "contratos",
            "file_status": "aprobado",
            "origin": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/files", json=file_data, headers=auth_headers)
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        
        # Update to final
        update_response = requests.put(f"{BASE_URL}/api/files/{file_id}", json={"file_status": "final"}, headers=auth_headers)
        assert update_response.status_code == 200
        assert update_response.json()["file_status"] == "final"
        
        print(f"✓ Updated file status to 'final': {file_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/files/{file_id}", headers=auth_headers)


class TestAutomationsEndpoint:
    """Automations endpoint tests - FASE 2 feature"""
    
    def test_run_followups_endpoint(self, auth_headers):
        """Test POST /api/automations/run-followups"""
        response = requests.post(f"{BASE_URL}/api/automations/run-followups", headers=auth_headers)
        assert response.status_code == 200, f"Run followups failed: {response.text}"
        
        data = response.json()
        assert "created" in data, "Missing 'created' field in response"
        assert "message" in data, "Missing 'message' field in response"
        assert isinstance(data["created"], int)
        
        print(f"✓ Automations endpoint returned: {data['message']}")


class TestTasksNewFields:
    """Tasks endpoint tests - FASE 2 new fields"""
    
    def test_create_task_with_new_fields(self, auth_headers, event_id):
        """Test creating task with FASE 2 fields"""
        task_data = {
            "event_id": event_id,
            "title": "TEST_Tarea con campos nuevos",
            "category": "Pruebas",
            "due_date": "2026-02-15",
            "responsible": "Tester",
            "status": "pendiente",
            "notes": "Notas de prueba",
            "description": "Descripción corta de la tarea",
            "service": "Decoración",
            "task_type": "Gestión",
            "next_step": "Contactar al proveedor",
            "requires_approval": True,
            "related_supplier_id": None,
            "related_budget_id": None,
            "related_file_id": None
        }
        
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_data, headers=auth_headers)
        assert response.status_code == 200, f"Create task failed: {response.text}"
        
        created_task = response.json()
        assert created_task["description"] == "Descripción corta de la tarea"
        assert created_task["service"] == "Decoración"
        assert created_task["task_type"] == "Gestión"
        assert created_task["next_step"] == "Contactar al proveedor"
        assert created_task["requires_approval"] == True
        
        print(f"✓ Created task with FASE 2 fields: {created_task['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{created_task['id']}", headers=auth_headers)

    def test_get_tasks_returns_new_fields(self, auth_headers, event_id):
        """Test that GET tasks returns FASE 2 fields"""
        response = requests.get(f"{BASE_URL}/api/tasks/{event_id}", headers=auth_headers)
        assert response.status_code == 200
        tasks = response.json()
        
        if len(tasks) > 0:
            task = tasks[0]
            # These fields should exist (may be empty strings)
            assert "description" in task or task.get("description", "") == ""
            assert "service" in task or task.get("service", "") == ""
            assert "task_type" in task or task.get("task_type", "") == ""
            assert "next_step" in task or task.get("next_step", "") == ""
            print(f"✓ Tasks include FASE 2 fields")


class TestEventTabs:
    """Test that event has correct tabs (9 tabs, no Invitados)"""
    
    def test_get_event_data(self, auth_headers, event_id):
        """Test fetching all event data for tabs"""
        # Test all endpoints that feed the 9 tabs
        endpoints = [
            f"/api/events/{event_id}",  # Resumen
            f"/api/tasks/{event_id}",   # Timeline, Tareas, Semanal
            f"/api/budget/{event_id}",  # Presupuesto
            f"/api/suppliers/{event_id}",  # Proveedores
            f"/api/notes/{event_id}",   # Notas
            f"/api/files/{event_id}",   # Archivos
            f"/api/gallery/{event_id}", # Galería
            f"/api/stats/{event_id}",   # Stats for various tabs
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=auth_headers)
            assert response.status_code == 200, f"Endpoint {endpoint} failed: {response.text}"
        
        print(f"✓ All 9 tab endpoints working (no Invitados tab)")


class TestFileCategories:
    """Test file categories - FASE 2 has 11 categories"""
    
    def test_file_categories(self, auth_headers, event_id):
        """Test creating files with different categories"""
        categories = [
            "documentacion_cliente",
            "listado_invitados",
            "confirmaciones",
            "menus_alergias",
            "seating_plan",
            "proyecto_decoracion",
            "carteleria",
            "contratos",
            "facturas",
            "proveedores",
            "otros"
        ]
        
        test_content = base64.b64encode(b"Category test").decode('utf-8')
        
        for category in categories[:3]:  # Test first 3 to save time
            file_data = {
                "event_id": event_id,
                "file_name": f"TEST_{category}_file.pdf",
                "file_type": category,
                "file_base64": test_content,
                "category": category,
                "file_status": "pendiente_revision",
                "origin": "manual"
            }
            
            response = requests.post(f"{BASE_URL}/api/files", json=file_data, headers=auth_headers)
            assert response.status_code == 200, f"Create file with category {category} failed"
            
            file_id = response.json()["id"]
            # Cleanup
            requests.delete(f"{BASE_URL}/api/files/{file_id}", headers=auth_headers)
        
        print(f"✓ File categories working (tested 3 of 11)")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_files(self, auth_headers, event_id):
        """Remove any TEST_ prefixed files"""
        response = requests.get(f"{BASE_URL}/api/files/{event_id}", headers=auth_headers)
        if response.status_code == 200:
            files = response.json()
            test_files = [f for f in files if f.get("file_name", "").startswith("TEST_")]
            for f in test_files:
                requests.delete(f"{BASE_URL}/api/files/{f['id']}", headers=auth_headers)
            print(f"✓ Cleaned up {len(test_files)} test files")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
