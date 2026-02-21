#!/usr/bin/env python3

import asyncio
import json
import uuid
from datetime import datetime, timezone

import httpx

# Test configuration
BASE_URL = "http://localhost:8001"
SESSION_TOKEN = "test_session_1771636067108"
USER_ID = "test-user-1771636067108"

async def test_auth_endpoints():
    """Test authentication endpoints"""
    print("\n=== Testing Authentication Endpoints ===")
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        
        # Test GET /api/auth/me
        print("\n1. Testing GET /api/auth/me")
        try:
            response = await client.get(f"{BASE_URL}/api/auth/me", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"User data: {json.dumps(data, indent=2)}")
                assert "user_id" in data
                assert data["user_id"] == USER_ID
                print("✅ Auth me endpoint working correctly")
            else:
                print(f"❌ Auth me endpoint failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Auth me endpoint error: {e}")
            return False
    
    return True

async def test_health_check_endpoints():
    """Test health check endpoints"""
    print("\n=== Testing Health Check Endpoints ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        
        # Test GET /api/health-check/questions
        print("\n1. Testing GET /api/health-check/questions")
        try:
            response = await client.get(f"{BASE_URL}/api/health-check/questions", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Total questions: {data.get('total_questions')}")
                print(f"Categories: {data.get('categories')}")
                assert "questions" in data
                assert len(data["questions"]) == 30  # 15 GDPR + 15 Cyber Essentials
                print("✅ Health check questions endpoint working correctly")
            else:
                print(f"❌ Health check questions failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Health check questions error: {e}")
            return False
        
        # Test POST /api/health-check/submit with sample responses
        print("\n2. Testing POST /api/health-check/submit")
        sample_responses = {
            "responses": [
                {"question_id": "gdpr_1", "answer": True, "notes": "We maintain comprehensive data records"},
                {"question_id": "gdpr_2", "answer": False, "notes": "Need to document lawful basis"},
                {"question_id": "gdpr_3", "answer": True, "notes": "Privacy notice is on our website"},
                {"question_id": "ce_1", "answer": True, "notes": "Corporate firewall in place"},
                {"question_id": "ce_2", "answer": False, "notes": "Firewall rules need review"},
                {"question_id": "ce_3", "answer": True, "notes": "Regular account cleanup performed"}
            ]
        }
        
        try:
            response = await client.post(
                f"{BASE_URL}/api/health-check/submit",
                json=sample_responses,
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Overall compliance score: {data.get('compliance_score')}%")
                print(f"GDPR score: {data.get('gdpr_score')}%")
                print(f"Cyber Essentials score: {data.get('cyber_essentials_score')}%")
                print(f"Risk level: {data.get('risk_level')}")
                print(f"Total gaps: {data.get('total_gaps')}")
                assert "compliance_score" in data
                assert "gdpr_score" in data
                assert "cyber_essentials_score" in data
                print("✅ Health check submission working correctly")
                return data["id"]  # Return the health check ID
            else:
                print(f"❌ Health check submission failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Health check submission error: {e}")
            return False
        
        # Test GET /api/health-check/latest
        print("\n3. Testing GET /api/health-check/latest")
        try:
            response = await client.get(f"{BASE_URL}/api/health-check/latest", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if data:
                    print(f"Latest health check score: {data.get('compliance_score')}%")
                    assert "compliance_score" in data
                    print("✅ Latest health check endpoint working correctly")
                else:
                    print("No health check found (this could be expected)")
            else:
                print(f"❌ Latest health check failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Latest health check error: {e}")
            return False
    
    return True

async def test_dashboard_endpoint():
    """Test dashboard endpoint"""
    print("\n=== Testing Dashboard Endpoint ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        
        print("\n1. Testing GET /api/dashboard")
        try:
            response = await client.get(f"{BASE_URL}/api/dashboard", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"User: {data.get('user', {}).get('name', 'N/A')}")
                print(f"Compliance score: {data.get('compliance_score', 'N/A')}")
                print(f"Risk stats: {data.get('risk_stats', {})}")
                print(f"Total documents: {data.get('total_documents', 0)}")
                print(f"Priority actions: {len(data.get('priority_actions', []))}")
                assert "user" in data
                assert "risk_stats" in data
                print("✅ Dashboard endpoint working correctly")
            else:
                print(f"❌ Dashboard endpoint failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Dashboard endpoint error: {e}")
            return False
    
    return True

async def test_risk_register_endpoints():
    """Test risk register endpoints"""
    print("\n=== Testing Risk Register Endpoints ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        
        # Test POST /api/risk-register/generate
        print("\n1. Testing POST /api/risk-register/generate")
        risk_data = {
            "business_type": "professional_services",
            "industry": "Legal Services"
        }
        
        try:
            response = await client.post(
                f"{BASE_URL}/api/risk-register/generate",
                json=risk_data,
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Risk register created with {data.get('total_risks')} risks")
                print(f"Business type: {data.get('business_type')}")
                risks = data.get('risks', [])
                if risks:
                    print(f"Sample risk: {risks[0].get('title')}")
                    risk_id = risks[0].get('risk_id')  # Store for update test
                assert "risks" in data
                assert len(data["risks"]) > 0
                print("✅ Risk register generation working correctly")
            else:
                print(f"❌ Risk register generation failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Risk register generation error: {e}")
            return False
        
        # Test GET /api/risk-register
        print("\n2. Testing GET /api/risk-register")
        try:
            response = await client.get(f"{BASE_URL}/api/risk-register", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if data:
                    print(f"Retrieved risk register with {data.get('total_risks')} risks")
                    risks = data.get('risks', [])
                    if risks:
                        risk_id = risks[0].get('risk_id')
                        print(f"First risk ID for update test: {risk_id}")
                    assert "risks" in data
                    print("✅ Risk register retrieval working correctly")
                else:
                    print("No risk register found")
                    return False
            else:
                print(f"❌ Risk register retrieval failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Risk register retrieval error: {e}")
            return False
        
        # Test PUT /api/risk-register/{risk_id}
        if 'risk_id' in locals():
            print(f"\n3. Testing PUT /api/risk-register/{risk_id}")
            update_data = {
                "status": "mitigating",
                "notes": "Risk mitigation plan has been implemented"
            }
            
            try:
                response = await client.put(
                    f"{BASE_URL}/api/risk-register/{risk_id}",
                    json=update_data,
                    headers=headers
                )
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"Risk updated: {data.get('message')}")
                    assert data.get("status") == "mitigating"
                    print("✅ Risk update working correctly")
                else:
                    print(f"❌ Risk update failed: {response.text}")
                    return False
            except Exception as e:
                print(f"❌ Risk update error: {e}")
                return False
    
    return True

async def test_subscription_endpoints():
    """Test subscription endpoints"""
    print("\n=== Testing Subscription Endpoints ===")
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        
        # Test GET /api/subscription
        print("\n1. Testing GET /api/subscription")
        try:
            response = await client.get(f"{BASE_URL}/api/subscription", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Plan type: {data.get('plan_type')}")
                print(f"Status: {data.get('status')}")
                print(f"Features: {json.dumps(data.get('features', {}), indent=2)}")
                assert "plan_type" in data
                print("✅ Subscription status endpoint working correctly")
            else:
                print(f"❌ Subscription status failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Subscription status error: {e}")
            return False
        
        # Test GET /api/subscription/plans
        print("\n2. Testing GET /api/subscription/plans")
        try:
            response = await client.get(f"{BASE_URL}/api/subscription/plans")
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                plans = data.get('plans', [])
                print(f"Available plans: {len(plans)}")
                for plan in plans:
                    print(f"  - {plan.get('name')}: £{plan.get('price')}/month")
                assert len(plans) > 0
                print("✅ Subscription plans endpoint working correctly")
            else:
                print(f"❌ Subscription plans failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Subscription plans error: {e}")
            return False
    
    return True

async def main():
    """Run all tests"""
    print("Starting ComplyPilot Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print(f"Session Token: {SESSION_TOKEN[:20]}...")
    print(f"User ID: {USER_ID}")
    
    results = {}
    
    # Test each endpoint group
    results["auth"] = await test_auth_endpoints()
    results["health_check"] = await test_health_check_endpoints()
    results["dashboard"] = await test_dashboard_endpoint()
    results["risk_register"] = await test_risk_register_endpoints()
    results["subscription"] = await test_subscription_endpoints()
    
    # Summary
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for category, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{category.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} test categories passed")
    
    if passed == total:
        print("🎉 All backend API tests passed!")
        return True
    else:
        print("⚠️ Some tests failed - check details above")
        return False

if __name__ == "__main__":
    asyncio.run(main())