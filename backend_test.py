#!/usr/bin/env python3
"""
Victoria Eventos Backend API Test Suite
Tests all endpoints for the wedding planner application
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import time

class VictoriaEventosAPITester:
    def __init__(self, base_url="https://victoria-weddings.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.planner_token = None
        self.couple_token = None
        self.test_event_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_token=True):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if use_token and self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"Response: {response.text[:200]}", "ERROR")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}", "ERROR")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_auth_flow(self):
        """Test authentication endpoints"""
        self.log("=== TESTING AUTHENTICATION ===")
        
        # Test user registration - Planner
        planner_data = {
            "name": f"Test Planner {datetime.now().strftime('%H%M%S')}",
            "email": f"planner_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "role": "planner"
        }
        
        success, response = self.run_test(
            "Register Planner",
            "POST",
            "auth/register",
            200,
            data=planner_data,
            use_token=False
        )
        
        if success and 'token' in response:
            self.planner_token = response['token']
            self.token = self.planner_token  # Set as default for subsequent tests
            self.log(f"Planner registered successfully: {response['user']['name']}")
        else:
            self.log("Failed to register planner", "ERROR")
            return False

        # Test user registration - Couple
        couple_data = {
            "name": f"Test Couple {datetime.now().strftime('%H%M%S')}",
            "email": f"couple_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "role": "pareja"
        }
        
        success, response = self.run_test(
            "Register Couple",
            "POST",
            "auth/register",
            200,
            data=couple_data,
            use_token=False
        )
        
        if success and 'token' in response:
            self.couple_token = response['token']
            self.log(f"Couple registered successfully: {response['user']['name']}")
        else:
            self.log("Failed to register couple", "ERROR")

        # Test login with planner credentials
        login_data = {
            "email": planner_data["email"],
            "password": planner_data["password"]
        }
        
        success, response = self.run_test(
            "Login Planner",
            "POST",
            "auth/login",
            200,
            data=login_data,
            use_token=False
        )
        
        if success and 'token' in response:
            self.log("Login successful")
        else:
            self.log("Login failed", "ERROR")

        # Test /auth/me endpoint
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

        return True

    def test_events_flow(self):
        """Test event management endpoints"""
        self.log("=== TESTING EVENTS ===")
        
        # Create event (planner only)
        event_data = {
            "title": f"Test Wedding {datetime.now().strftime('%H%M%S')}",
            "date": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            "event_type": "boda",
            "status": "pending"
        }
        
        success, response = self.run_test(
            "Create Event",
            "POST",
            "events",
            200,
            data=event_data
        )
        
        if success and 'id' in response:
            self.test_event_id = response['id']
            self.log(f"Event created with ID: {self.test_event_id}")
        else:
            self.log("Failed to create event", "ERROR")
            return False

        # Get all events
        self.run_test(
            "Get Events List",
            "GET",
            "events",
            200
        )

        # Get specific event
        self.run_test(
            "Get Event Details",
            "GET",
            f"events/{self.test_event_id}",
            200
        )

        # Update event
        updated_event_data = {
            **event_data,
            "title": f"Updated {event_data['title']}"
        }
        
        self.run_test(
            "Update Event",
            "PUT",
            f"events/{self.test_event_id}",
            200,
            data=updated_event_data
        )

        return True

    def test_tasks_flow(self):
        """Test task management endpoints"""
        if not self.test_event_id:
            self.log("No event ID available for task tests", "ERROR")
            return False
            
        self.log("=== TESTING TASKS ===")
        
        # Create task
        task_data = {
            "title": "Test Task - Decoración",
            "category": "Decoración",
            "due_date": (datetime.now() + timedelta(days=15)).strftime('%Y-%m-%d'),
            "responsible": "Test Planner",
            "status": "pending",
            "event_id": self.test_event_id
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        task_id = response.get('id') if success else None

        # Get tasks for event
        self.run_test(
            "Get Tasks",
            "GET",
            f"tasks/{self.test_event_id}",
            200
        )

        # Update task status
        if task_id:
            updated_task_data = {
                **task_data,
                "status": "completed"
            }
            
            self.run_test(
                "Update Task",
                "PUT",
                f"tasks/{task_id}",
                200,
                data=updated_task_data
            )

        return True

    def test_guests_flow(self):
        """Test guest management endpoints"""
        if not self.test_event_id:
            self.log("No event ID available for guest tests", "ERROR")
            return False
            
        self.log("=== TESTING GUESTS ===")
        
        # Create guest
        guest_data = {
            "name": "María García",
            "rsvp": "confirmed",
            "companions_count": 1,
            "allergies": "Sin gluten",
            "event_id": self.test_event_id
        }
        
        success, response = self.run_test(
            "Create Guest",
            "POST",
            "guests",
            200,
            data=guest_data
        )
        
        guest_id = response.get('id') if success else None

        # Get guests for event
        self.run_test(
            "Get Guests",
            "GET",
            f"guests/{self.test_event_id}",
            200
        )

        # Update guest
        if guest_id:
            updated_guest_data = {
                **guest_data,
                "rsvp": "declined"
            }
            
            self.run_test(
                "Update Guest",
                "PUT",
                f"guests/{guest_id}",
                200,
                data=updated_guest_data
            )

        return True

    def test_budget_flow(self):
        """Test budget management endpoints"""
        if not self.test_event_id:
            self.log("No event ID available for budget tests", "ERROR")
            return False
            
        self.log("=== TESTING BUDGET ===")
        
        # Create budget item
        budget_data = {
            "category": "Catering",
            "description": "Menú para 100 personas",
            "estimated_amount": 5000.00,
            "paid_amount": 1500.00,
            "status": "partial",
            "event_id": self.test_event_id
        }
        
        success, response = self.run_test(
            "Create Budget Item",
            "POST",
            "budget",
            200,
            data=budget_data
        )
        
        budget_id = response.get('id') if success else None

        # Get budget items for event
        self.run_test(
            "Get Budget Items",
            "GET",
            f"budget/{self.test_event_id}",
            200
        )

        # Update budget item
        if budget_id:
            updated_budget_data = {
                **budget_data,
                "paid_amount": 5000.00,
                "status": "paid"
            }
            
            self.run_test(
                "Update Budget Item",
                "PUT",
                f"budget/{budget_id}",
                200,
                data=updated_budget_data
            )

        return True

    def test_suppliers_flow(self):
        """Test supplier management endpoints"""
        if not self.test_event_id:
            self.log("No event ID available for supplier tests", "ERROR")
            return False
            
        self.log("=== TESTING SUPPLIERS ===")
        
        # Create supplier
        supplier_data = {
            "name": "Fotografía Elegante",
            "service_type": "Fotografía",
            "contact": "foto@elegante.com",
            "booking_status": "confirmed",
            "notes": "Especialistas en bodas",
            "event_id": self.test_event_id
        }
        
        success, response = self.run_test(
            "Create Supplier",
            "POST",
            "suppliers",
            200,
            data=supplier_data
        )
        
        supplier_id = response.get('id') if success else None

        # Get suppliers for event
        self.run_test(
            "Get Suppliers",
            "GET",
            f"suppliers/{self.test_event_id}",
            200
        )

        # Update supplier
        if supplier_id:
            updated_supplier_data = {
                **supplier_data,
                "booking_status": "cancelled"
            }
            
            self.run_test(
                "Update Supplier",
                "PUT",
                f"suppliers/{supplier_id}",
                200,
                data=updated_supplier_data
            )

        return True

    def test_notes_flow(self):
        """Test notes/communication endpoints"""
        if not self.test_event_id:
            self.log("No event ID available for notes tests", "ERROR")
            return False
            
        self.log("=== TESTING NOTES ===")
        
        # Create note
        note_data = {
            "content": "Recordar confirmar el menú con el catering la próxima semana",
            "event_id": self.test_event_id
        }
        
        success, response = self.run_test(
            "Create Note",
            "POST",
            "notes",
            200,
            data=note_data
        )
        
        note_id = response.get('id') if success else None

        # Get notes for event
        self.run_test(
            "Get Notes",
            "GET",
            f"notes/{self.test_event_id}",
            200
        )

        return True

    def test_gallery_flow(self):
        """Test AI gallery generation endpoints"""
        if not self.test_event_id:
            self.log("No event ID available for gallery tests", "ERROR")
            return False
            
        self.log("=== TESTING GALLERY (AI Image Generation) ===")
        
        # Test gallery generation (this might take time)
        gallery_data = {
            "generated_prompt": "Una mesa elegante de boda con decoración floral en tonos beige y dorado",
            "event_id": self.test_event_id
        }
        
        self.log("Generating AI image (this may take up to 60 seconds)...")
        success, response = self.run_test(
            "Generate Gallery Image",
            "POST",
            "gallery/generate",
            200,
            data=gallery_data
        )
        
        if success:
            self.log("AI image generated successfully")
        else:
            self.log("AI image generation failed - this might be due to API key issues", "WARNING")

        # Get gallery images for event
        self.run_test(
            "Get Gallery Images",
            "GET",
            f"gallery/{self.test_event_id}",
            200
        )

        return True

    def test_decor_flow(self):
        """Test decoration decisions endpoints"""
        if not self.test_event_id:
            self.log("No event ID available for decor tests", "ERROR")
            return False
            
        self.log("=== TESTING DECORATION DECISIONS ===")
        
        # Create decoration decision
        decor_data = {
            "item_name": "Color de manteles",
            "status": "chosen",
            "notes": "Elegido color beige para combinar con la decoración",
            "event_id": self.test_event_id
        }
        
        success, response = self.run_test(
            "Create Decor Decision",
            "POST",
            "decor",
            200,
            data=decor_data
        )
        
        decor_id = response.get('id') if success else None

        # Get decoration decisions for event
        self.run_test(
            "Get Decor Decisions",
            "GET",
            f"decor/{self.test_event_id}",
            200
        )

        # Update decoration decision
        if decor_id:
            updated_decor_data = {
                **decor_data,
                "status": "ordered"
            }
            
            self.run_test(
                "Update Decor Decision",
                "PUT",
                f"decor/{decor_id}",
                200,
                data=updated_decor_data
            )

        return True

    def test_stats_endpoint(self):
        """Test event statistics endpoint"""
        if not self.test_event_id:
            self.log("No event ID available for stats test", "ERROR")
            return False
            
        self.log("=== TESTING STATISTICS ===")
        
        success, response = self.run_test(
            "Get Event Statistics",
            "GET",
            f"stats/{self.test_event_id}",
            200
        )
        
        if success:
            self.log(f"Stats retrieved: {json.dumps(response, indent=2)}")

        return True

    def run_all_tests(self):
        """Run complete test suite"""
        self.log("🚀 Starting Victoria Eventos API Test Suite")
        self.log(f"Testing against: {self.base_url}")
        
        start_time = time.time()
        
        try:
            # Run all test flows
            self.test_auth_flow()
            self.test_events_flow()
            self.test_tasks_flow()
            self.test_guests_flow()
            self.test_budget_flow()
            self.test_suppliers_flow()
            self.test_notes_flow()
            self.test_gallery_flow()
            self.test_decor_flow()
            self.test_stats_endpoint()
            
        except Exception as e:
            self.log(f"Test suite failed with exception: {str(e)}", "ERROR")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print results
        self.log("=" * 50)
        self.log("📊 TEST RESULTS SUMMARY")
        self.log("=" * 50)
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Tests failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        self.log(f"Duration: {duration:.2f} seconds")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                self.log(f"  - {test}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = VictoriaEventosAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())