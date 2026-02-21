from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import base64
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI client
openai_client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY', ''))

# Create the main app
app = FastAPI(title="ComplyPilot API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# Pydantic Models
# =============================================================================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    employee_count: Optional[int] = None
    industry: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    employee_count: Optional[int] = None
    industry: Optional[str] = None

class SessionCreate(BaseModel):
    session_id: str

class HealthCheckResponse(BaseModel):
    question_id: str
    answer: bool
    notes: Optional[str] = None

class HealthCheckSubmit(BaseModel):
    responses: List[HealthCheckResponse]

class DocumentAnalysis(BaseModel):
    document_id: str

class RiskRegisterGenerate(BaseModel):
    business_type: str
    industry: Optional[str] = None

class RiskUpdate(BaseModel):
    status: str  # "identified", "mitigating", "resolved", "accepted"
    notes: Optional[str] = None

class SubscriptionModel(BaseModel):
    plan_type: str  # "free", "starter", "professional", "enterprise"
    status: str = "active"

# =============================================================================
# UK SME Compliance Questions - GDPR & Cyber Essentials
# =============================================================================

GDPR_QUESTIONS = [
    {"id": "gdpr_1", "category": "GDPR", "subcategory": "Data Inventory", "question": "Do you maintain a record of all personal data you collect and process?", "weight": 3, "guidance": "Article 30 of GDPR requires maintaining records of processing activities."},
    {"id": "gdpr_2", "category": "GDPR", "subcategory": "Lawful Basis", "question": "Have you identified and documented a lawful basis for each processing activity?", "weight": 3, "guidance": "You must have a valid lawful basis under Article 6 for processing personal data."},
    {"id": "gdpr_3", "category": "GDPR", "subcategory": "Privacy Notice", "question": "Do you have a clear, accessible privacy notice that explains how you use personal data?", "weight": 2, "guidance": "Articles 13-14 require transparent communication about data processing."},
    {"id": "gdpr_4", "category": "GDPR", "subcategory": "Consent", "question": "Where you rely on consent, can individuals easily withdraw it?", "weight": 2, "guidance": "Consent must be freely given, specific, informed, and unambiguous."},
    {"id": "gdpr_5", "category": "GDPR", "subcategory": "Data Subject Rights", "question": "Do you have procedures to respond to data subject access requests within 30 days?", "weight": 3, "guidance": "Individuals have the right to access their personal data under Article 15."},
    {"id": "gdpr_6", "category": "GDPR", "subcategory": "Data Subject Rights", "question": "Can you fulfil requests to erase personal data (right to be forgotten)?", "weight": 2, "guidance": "Article 17 gives individuals the right to erasure in certain circumstances."},
    {"id": "gdpr_7", "category": "GDPR", "subcategory": "Data Retention", "question": "Do you have a data retention policy specifying how long you keep personal data?", "weight": 2, "guidance": "Personal data should not be kept longer than necessary for the purposes for which it is processed."},
    {"id": "gdpr_8", "category": "GDPR", "subcategory": "Data Security", "question": "Have you implemented appropriate technical measures to protect personal data?", "weight": 3, "guidance": "Article 32 requires implementing appropriate technical and organisational security measures."},
    {"id": "gdpr_9", "category": "GDPR", "subcategory": "Data Security", "question": "Do you encrypt personal data in transit and at rest?", "weight": 2, "guidance": "Encryption is a recommended security measure under GDPR."},
    {"id": "gdpr_10", "category": "GDPR", "subcategory": "Breach Response", "question": "Do you have a data breach response procedure in place?", "weight": 3, "guidance": "You must report certain breaches to the ICO within 72 hours under Article 33."},
    {"id": "gdpr_11", "category": "GDPR", "subcategory": "DPO", "question": "Have you assessed whether you need to appoint a Data Protection Officer?", "weight": 1, "guidance": "Article 37 specifies when a DPO is required."},
    {"id": "gdpr_12", "category": "GDPR", "subcategory": "International Transfers", "question": "Do you have appropriate safeguards for transferring personal data outside the UK?", "weight": 2, "guidance": "International transfers require adequate protection mechanisms."},
    {"id": "gdpr_13", "category": "GDPR", "subcategory": "Staff Training", "question": "Do all staff who handle personal data receive data protection training?", "weight": 2, "guidance": "Staff awareness is a key organisational measure for compliance."},
    {"id": "gdpr_14", "category": "GDPR", "subcategory": "Third Parties", "question": "Do you have written contracts with all processors who handle personal data on your behalf?", "weight": 3, "guidance": "Article 28 requires contracts with data processors specifying processing terms."},
    {"id": "gdpr_15", "category": "GDPR", "subcategory": "DPIA", "question": "Do you conduct Data Protection Impact Assessments for high-risk processing?", "weight": 2, "guidance": "DPIAs are required under Article 35 for processing likely to result in high risk."},
]

CYBER_ESSENTIALS_QUESTIONS = [
    {"id": "ce_1", "category": "Cyber Essentials", "subcategory": "Firewalls", "question": "Do you have a properly configured firewall protecting your network boundary?", "weight": 3, "guidance": "Firewalls are the first line of defence against network attacks."},
    {"id": "ce_2", "category": "Cyber Essentials", "subcategory": "Firewalls", "question": "Are all firewall rules documented and reviewed regularly?", "weight": 2, "guidance": "Regular reviews ensure firewall rules remain appropriate and secure."},
    {"id": "ce_3", "category": "Cyber Essentials", "subcategory": "Secure Configuration", "question": "Do you remove or disable unnecessary user accounts?", "weight": 2, "guidance": "Reducing attack surface by removing unused accounts."},
    {"id": "ce_4", "category": "Cyber Essentials", "subcategory": "Secure Configuration", "question": "Do you change default passwords on all devices and software?", "weight": 3, "guidance": "Default credentials are a common attack vector."},
    {"id": "ce_5", "category": "Cyber Essentials", "subcategory": "Secure Configuration", "question": "Is auto-run disabled for media and network drives?", "weight": 2, "guidance": "Prevents automatic execution of malicious code."},
    {"id": "ce_6", "category": "Cyber Essentials", "subcategory": "Access Control", "question": "Do users only have access to the data and systems they need for their role?", "weight": 3, "guidance": "Principle of least privilege reduces risk of data breaches."},
    {"id": "ce_7", "category": "Cyber Essentials", "subcategory": "Access Control", "question": "Do you use multi-factor authentication for accessing cloud services?", "weight": 3, "guidance": "MFA significantly reduces the risk of account compromise."},
    {"id": "ce_8", "category": "Cyber Essentials", "subcategory": "Access Control", "question": "Are administrator accounts separate from normal user accounts?", "weight": 2, "guidance": "Separation prevents privilege escalation attacks."},
    {"id": "ce_9", "category": "Cyber Essentials", "subcategory": "Malware Protection", "question": "Is anti-malware software installed on all devices?", "weight": 3, "guidance": "Essential protection against viruses and malware."},
    {"id": "ce_10", "category": "Cyber Essentials", "subcategory": "Malware Protection", "question": "Is your anti-malware software set to update automatically?", "weight": 2, "guidance": "Regular updates ensure protection against new threats."},
    {"id": "ce_11", "category": "Cyber Essentials", "subcategory": "Malware Protection", "question": "Is your anti-malware software configured to scan files automatically?", "weight": 2, "guidance": "Automatic scanning catches threats before they execute."},
    {"id": "ce_12", "category": "Cyber Essentials", "subcategory": "Patch Management", "question": "Are operating systems set to update automatically?", "weight": 3, "guidance": "Patching fixes known vulnerabilities that attackers exploit."},
    {"id": "ce_13", "category": "Cyber Essentials", "subcategory": "Patch Management", "question": "Do you apply high-risk security patches within 14 days of release?", "weight": 3, "guidance": "Timely patching is critical for preventing exploitation."},
    {"id": "ce_14", "category": "Cyber Essentials", "subcategory": "Patch Management", "question": "Do you remove unsupported software from your systems?", "weight": 2, "guidance": "Unsupported software no longer receives security updates."},
    {"id": "ce_15", "category": "Cyber Essentials", "subcategory": "Password Policy", "question": "Do you enforce a minimum password length of at least 12 characters?", "weight": 2, "guidance": "Longer passwords are significantly harder to crack."},
]

ALL_QUESTIONS = GDPR_QUESTIONS + CYBER_ESSENTIALS_QUESTIONS

# =============================================================================
# Risk Templates by Business Type
# =============================================================================

RISK_TEMPLATES = {
    "retail": [
        {"risk_id": "retail_1", "title": "Customer Payment Data Breach", "description": "Unauthorised access to stored payment card details", "likelihood": "medium", "impact": "high", "category": "Data Security", "mitigation": "Implement PCI DSS compliance measures, tokenise card data"},
        {"risk_id": "retail_2", "title": "E-commerce Platform Vulnerability", "description": "Security vulnerabilities in online shopping systems", "likelihood": "medium", "impact": "high", "category": "Cyber Security", "mitigation": "Regular security testing, WAF implementation, secure coding practices"},
        {"risk_id": "retail_3", "title": "Customer Data Marketing Misuse", "description": "Using customer data for marketing without proper consent", "likelihood": "high", "impact": "medium", "category": "GDPR Compliance", "mitigation": "Implement consent management platform, review marketing permissions"},
        {"risk_id": "retail_4", "title": "Third-Party Delivery Partner Data Sharing", "description": "Inadequate data protection with delivery partners", "likelihood": "medium", "impact": "medium", "category": "Third Party Risk", "mitigation": "Review contracts, implement data processing agreements"},
        {"risk_id": "retail_5", "title": "Point of Sale System Compromise", "description": "Malware infection on POS systems", "likelihood": "medium", "impact": "high", "category": "Cyber Security", "mitigation": "POS system hardening, network segmentation, regular scanning"},
    ],
    "professional_services": [
        {"risk_id": "ps_1", "title": "Client Confidentiality Breach", "description": "Unauthorised disclosure of sensitive client information", "likelihood": "medium", "impact": "high", "category": "Data Security", "mitigation": "Access controls, encryption, staff training on confidentiality"},
        {"risk_id": "ps_2", "title": "Email Phishing Attack", "description": "Staff falling victim to sophisticated phishing attempts", "likelihood": "high", "impact": "high", "category": "Cyber Security", "mitigation": "Phishing awareness training, email filtering, MFA enforcement"},
        {"risk_id": "ps_3", "title": "Document Retention Non-Compliance", "description": "Retaining client documents beyond legal requirements", "likelihood": "high", "impact": "medium", "category": "GDPR Compliance", "mitigation": "Implement retention schedules, automated deletion, regular audits"},
        {"risk_id": "ps_4", "title": "Remote Working Data Exposure", "description": "Data leakage through insecure remote working practices", "likelihood": "high", "impact": "medium", "category": "Cyber Security", "mitigation": "VPN usage, device encryption, secure file sharing policies"},
        {"risk_id": "ps_5", "title": "Subcontractor Data Handling", "description": "Inadequate data protection by subcontracted parties", "likelihood": "medium", "impact": "medium", "category": "Third Party Risk", "mitigation": "Due diligence, contractual obligations, periodic audits"},
    ],
    "healthcare": [
        {"risk_id": "hc_1", "title": "Patient Record Breach", "description": "Unauthorised access to sensitive health records", "likelihood": "medium", "impact": "high", "category": "Data Security", "mitigation": "Role-based access, audit logging, encryption"},
        {"risk_id": "hc_2", "title": "Medical Device Vulnerability", "description": "Security flaws in connected medical equipment", "likelihood": "medium", "impact": "high", "category": "Cyber Security", "mitigation": "Device inventory, network segmentation, patch management"},
        {"risk_id": "hc_3", "title": "Special Category Data Mishandling", "description": "Processing health data without appropriate safeguards", "likelihood": "medium", "impact": "high", "category": "GDPR Compliance", "mitigation": "Article 9 compliance review, DPIA for processing activities"},
        {"risk_id": "hc_4", "title": "Ransomware Attack", "description": "Encryption of patient records by malicious actors", "likelihood": "high", "impact": "high", "category": "Cyber Security", "mitigation": "Offline backups, endpoint protection, incident response plan"},
        {"risk_id": "hc_5", "title": "Consent Management Failure", "description": "Processing patient data without valid consent", "likelihood": "medium", "impact": "medium", "category": "GDPR Compliance", "mitigation": "Consent audit, digital consent capture, staff training"},
    ],
    "technology": [
        {"risk_id": "tech_1", "title": "Source Code Theft", "description": "Unauthorised access to proprietary software code", "likelihood": "medium", "impact": "high", "category": "Data Security", "mitigation": "Code repository security, access controls, DLP solutions"},
        {"risk_id": "tech_2", "title": "Cloud Infrastructure Misconfiguration", "description": "Security gaps in cloud service setup", "likelihood": "high", "impact": "high", "category": "Cyber Security", "mitigation": "Cloud security posture management, configuration audits"},
        {"risk_id": "tech_3", "title": "Customer Data Processing Scope Creep", "description": "Processing customer data beyond agreed purposes", "likelihood": "medium", "impact": "medium", "category": "GDPR Compliance", "mitigation": "Data mapping, processing registers, privacy by design"},
        {"risk_id": "tech_4", "title": "API Security Breach", "description": "Exploitation of API vulnerabilities exposing data", "likelihood": "high", "impact": "high", "category": "Cyber Security", "mitigation": "API security testing, authentication, rate limiting"},
        {"risk_id": "tech_5", "title": "International Data Transfer Issues", "description": "Non-compliant data transfers to overseas development teams", "likelihood": "high", "impact": "medium", "category": "GDPR Compliance", "mitigation": "SCCs, adequacy decisions, data localisation"},
    ],
    "manufacturing": [
        {"risk_id": "mfg_1", "title": "Industrial Control System Attack", "description": "Cyber attack on operational technology systems", "likelihood": "medium", "impact": "high", "category": "Cyber Security", "mitigation": "OT/IT segregation, ICS security monitoring"},
        {"risk_id": "mfg_2", "title": "Supply Chain Data Breach", "description": "Compromise through supplier systems", "likelihood": "medium", "impact": "medium", "category": "Third Party Risk", "mitigation": "Supplier security assessments, access restrictions"},
        {"risk_id": "mfg_3", "title": "Employee Personal Data Exposure", "description": "HR system vulnerabilities exposing staff data", "likelihood": "medium", "impact": "medium", "category": "GDPR Compliance", "mitigation": "HR system security review, access controls"},
        {"risk_id": "mfg_4", "title": "Legacy System Vulnerabilities", "description": "Unpatched legacy systems creating security gaps", "likelihood": "high", "impact": "medium", "category": "Cyber Security", "mitigation": "Legacy system audit, upgrade planning, compensating controls"},
        {"risk_id": "mfg_5", "title": "CCTV Compliance Issues", "description": "Non-compliant use of workplace surveillance", "likelihood": "medium", "impact": "low", "category": "GDPR Compliance", "mitigation": "CCTV policy review, signage, retention limits"},
    ],
    "general": [
        {"risk_id": "gen_1", "title": "Ransomware Attack", "description": "Malicious encryption of business data", "likelihood": "high", "impact": "high", "category": "Cyber Security", "mitigation": "Regular backups, endpoint protection, staff training"},
        {"risk_id": "gen_2", "title": "Phishing and Social Engineering", "description": "Staff manipulation to disclose credentials or data", "likelihood": "high", "impact": "high", "category": "Cyber Security", "mitigation": "Security awareness training, email filtering, MFA"},
        {"risk_id": "gen_3", "title": "Data Subject Rights Non-Compliance", "description": "Failure to respond to data subject requests timely", "likelihood": "medium", "impact": "medium", "category": "GDPR Compliance", "mitigation": "DSR procedures, staff training, request tracking"},
        {"risk_id": "gen_4", "title": "Third Party Data Breach", "description": "Data exposure through supplier or partner systems", "likelihood": "medium", "impact": "medium", "category": "Third Party Risk", "mitigation": "Vendor assessments, contractual obligations, monitoring"},
        {"risk_id": "gen_5", "title": "Unencrypted Data Storage", "description": "Personal data stored without encryption", "likelihood": "medium", "impact": "medium", "category": "Data Security", "mitigation": "Encryption at rest implementation, security audits"},
    ],
}

# =============================================================================
# Authentication Helper
# =============================================================================

async def get_current_user(request: Request) -> User:
    """Get current user from session token in cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# =============================================================================
# Auth Endpoints
# =============================================================================

@api_router.post("/auth/session")
async def create_session(data: SessionCreate, response: Response):
    """Exchange session_id from Emergent Auth for a session_token"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id}
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            auth_data = resp.json()
    except httpx.RequestError as e:
        logger.error(f"Error contacting auth service: {e}")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if existing_user:
        # Update existing user
        await db.users.update_one(
            {"email": auth_data["email"]},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture")
            }}
        )
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "company_name": None,
            "business_type": None,
            "employee_count": None,
            "industry": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = auth_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Remove any existing sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Create new session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"message": "Session created", "user": user_doc}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user by clearing session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}

# =============================================================================
# User Profile Endpoints
# =============================================================================

@api_router.get("/users/profile")
async def get_profile(user: User = Depends(get_current_user)):
    """Get user profile"""
    return user.model_dump()

@api_router.put("/users/profile")
async def update_profile(
    profile: UserProfileUpdate,
    user: User = Depends(get_current_user)
):
    """Update user profile"""
    update_data = {k: v for k, v in profile.model_dump().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return user_doc

# =============================================================================
# Health Check Endpoints
# =============================================================================

@api_router.get("/health-check/questions")
async def get_health_check_questions(user: User = Depends(get_current_user)):
    """Get all compliance questions for the health check"""
    return {
        "questions": ALL_QUESTIONS,
        "total_questions": len(ALL_QUESTIONS),
        "categories": {
            "GDPR": len(GDPR_QUESTIONS),
            "Cyber Essentials": len(CYBER_ESSENTIALS_QUESTIONS)
        }
    }

@api_router.post("/health-check/submit")
async def submit_health_check(
    submission: HealthCheckSubmit,
    user: User = Depends(get_current_user)
):
    """Submit health check responses and calculate compliance score"""
    responses_dict = {r.question_id: r for r in submission.responses}
    
    gdpr_score = 0
    gdpr_max = 0
    cyber_score = 0
    cyber_max = 0
    
    gaps = []
    strengths = []
    
    for q in ALL_QUESTIONS:
        response = responses_dict.get(q["id"])
        weight = q["weight"]
        
        if q["category"] == "GDPR":
            gdpr_max += weight
            if response and response.answer:
                gdpr_score += weight
            elif response and not response.answer:
                gaps.append({
                    "question_id": q["id"],
                    "category": q["category"],
                    "subcategory": q["subcategory"],
                    "question": q["question"],
                    "guidance": q["guidance"],
                    "priority": "high" if weight >= 3 else "medium" if weight >= 2 else "low"
                })
        else:
            cyber_max += weight
            if response and response.answer:
                cyber_score += weight
            elif response and not response.answer:
                gaps.append({
                    "question_id": q["id"],
                    "category": q["category"],
                    "subcategory": q["subcategory"],
                    "question": q["question"],
                    "guidance": q["guidance"],
                    "priority": "high" if weight >= 3 else "medium" if weight >= 2 else "low"
                })
    
    # Calculate percentages
    gdpr_percentage = round((gdpr_score / gdpr_max) * 100) if gdpr_max > 0 else 0
    cyber_percentage = round((cyber_score / cyber_max) * 100) if cyber_max > 0 else 0
    overall_percentage = round(((gdpr_score + cyber_score) / (gdpr_max + cyber_max)) * 100) if (gdpr_max + cyber_max) > 0 else 0
    
    # Generate risk level
    if overall_percentage >= 80:
        risk_level = "low"
    elif overall_percentage >= 60:
        risk_level = "medium"
    elif overall_percentage >= 40:
        risk_level = "high"
    else:
        risk_level = "critical"
    
    # Sort gaps by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    gaps.sort(key=lambda x: priority_order.get(x["priority"], 3))
    
    # Create health check record
    health_check = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "responses": [r.model_dump() for r in submission.responses],
        "compliance_score": overall_percentage,
        "gdpr_score": gdpr_percentage,
        "cyber_essentials_score": cyber_percentage,
        "risk_level": risk_level,
        "gaps": gaps,
        "total_gaps": len(gaps),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.health_checks.insert_one(health_check)
    
    # Remove _id for response
    health_check.pop("_id", None)
    
    return health_check

@api_router.get("/health-check/history")
async def get_health_check_history(user: User = Depends(get_current_user)):
    """Get health check history for the user"""
    health_checks = await db.health_checks.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"health_checks": health_checks}

@api_router.get("/health-check/latest")
async def get_latest_health_check(user: User = Depends(get_current_user)):
    """Get the most recent health check"""
    health_check = await db.health_checks.find_one(
        {"user_id": user.user_id},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not health_check:
        return None
    
    return health_check

# =============================================================================
# Document Upload & Analysis Endpoints
# =============================================================================

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Upload a policy document for analysis"""
    # Check file type
    allowed_types = ["application/pdf", "text/plain", "application/msword", 
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload PDF, TXT, DOC, or DOCX files."
        )
    
    # Read file content
    content = await file.read()
    content_base64 = base64.b64encode(content).decode("utf-8")
    
    # Create document record
    document = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "filename": file.filename,
        "file_type": file.content_type,
        "file_size": len(content),
        "content_base64": content_base64,
        "analysis_status": "pending",
        "analysis_result": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.documents.insert_one(document)
    document.pop("_id", None)
    document.pop("content_base64", None)  # Don't return the full content
    
    return document

@api_router.get("/documents")
async def list_documents(user: User = Depends(get_current_user)):
    """List all documents for the user"""
    documents = await db.documents.find(
        {"user_id": user.user_id},
        {"_id": 0, "content_base64": 0}  # Exclude large fields
    ).sort("created_at", -1).to_list(100)
    
    return {"documents": documents}

@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, user: User = Depends(get_current_user)):
    """Get a specific document with analysis results"""
    document = await db.documents.find_one(
        {"id": document_id, "user_id": user.user_id},
        {"_id": 0, "content_base64": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document

@api_router.post("/documents/{document_id}/analyze")
async def analyze_document(document_id: str, user: User = Depends(get_current_user)):
    """Analyze a document against GDPR and Cyber Essentials requirements"""
    document = await db.documents.find_one(
        {"id": document_id, "user_id": user.user_id}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Decode content for analysis
    try:
        content = base64.b64decode(document["content_base64"]).decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"Error decoding document: {e}")
        content = "Unable to extract text content from document"
    
    # Limit content length for API
    content = content[:15000] if len(content) > 15000 else content
    
    # Create analysis prompt
    analysis_prompt = f"""You are a UK compliance expert specializing in GDPR and Cyber Essentials certification.

Analyze the following policy document and provide a detailed compliance gap analysis. 

Document content:
---
{content}
---

Provide your analysis in the following JSON format:
{{
    "document_type": "string describing what type of policy this appears to be",
    "overall_assessment": "string with brief overall assessment",
    "gdpr_compliance": {{
        "score": number from 0-100,
        "status": "compliant|partial|non-compliant",
        "strengths": ["list of GDPR strengths found"],
        "gaps": ["list of specific GDPR gaps or missing elements"],
        "recommendations": ["actionable recommendations to address gaps"]
    }},
    "cyber_essentials_compliance": {{
        "score": number from 0-100,
        "status": "compliant|partial|non-compliant|not-applicable",
        "strengths": ["list of Cyber Essentials strengths found"],
        "gaps": ["list of specific gaps against Cyber Essentials controls"],
        "recommendations": ["actionable recommendations"]
    }},
    "priority_actions": [
        {{
            "priority": "high|medium|low",
            "action": "specific action to take",
            "framework": "GDPR|Cyber Essentials|Both",
            "rationale": "why this is important"
        }}
    ],
    "risk_summary": "brief paragraph summarizing the compliance risk exposure"
}}

Be specific and practical in your recommendations, tailored for UK SMEs with 5-50 employees."""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": "You are a UK compliance expert. Always respond with valid JSON only."},
                {"role": "user", "content": analysis_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        analysis_result = response.choices[0].message.content
        import json
        analysis_data = json.loads(analysis_result)
        
        # Update document with analysis
        await db.documents.update_one(
            {"id": document_id},
            {"$set": {
                "analysis_status": "completed",
                "analysis_result": analysis_data,
                "analyzed_at": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "document_id": document_id,
            "filename": document["filename"],
            "analysis": analysis_data,
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error analyzing document: {e}")
        await db.documents.update_one(
            {"id": document_id},
            {"$set": {
                "analysis_status": "failed",
                "analysis_error": str(e)
            }}
        )
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: User = Depends(get_current_user)):
    """Delete a document"""
    result = await db.documents.delete_one(
        {"id": document_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}

# =============================================================================
# Risk Register Endpoints
# =============================================================================

@api_router.post("/risk-register/generate")
async def generate_risk_register(
    data: RiskRegisterGenerate,
    user: User = Depends(get_current_user)
):
    """Generate a risk register based on business type"""
    business_type = data.business_type.lower().replace(" ", "_")
    
    # Get template risks
    template_risks = RISK_TEMPLATES.get(business_type, RISK_TEMPLATES["general"])
    
    # Create risks with user-specific IDs
    risks = []
    for risk in template_risks:
        risks.append({
            **risk,
            "risk_id": str(uuid.uuid4()),
            "status": "identified",
            "owner": None,
            "due_date": None,
            "notes": None
        })
    
    # Create or update risk register
    risk_register = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "business_type": data.business_type,
        "industry": data.industry,
        "risks": risks,
        "total_risks": len(risks),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Delete old risk register if exists
    await db.risk_registers.delete_many({"user_id": user.user_id})
    
    # Insert new risk register
    await db.risk_registers.insert_one(risk_register)
    risk_register.pop("_id", None)
    
    # Update user profile with business type
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"business_type": data.business_type, "industry": data.industry}}
    )
    
    return risk_register

@api_router.get("/risk-register")
async def get_risk_register(user: User = Depends(get_current_user)):
    """Get the user's risk register"""
    risk_register = await db.risk_registers.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    if not risk_register:
        return None
    
    return risk_register

@api_router.put("/risk-register/{risk_id}")
async def update_risk(
    risk_id: str,
    update: RiskUpdate,
    user: User = Depends(get_current_user)
):
    """Update a specific risk in the register"""
    # Find the risk register
    risk_register = await db.risk_registers.find_one(
        {"user_id": user.user_id}
    )
    
    if not risk_register:
        raise HTTPException(status_code=404, detail="Risk register not found")
    
    # Update the specific risk
    updated = False
    for risk in risk_register["risks"]:
        if risk["risk_id"] == risk_id:
            risk["status"] = update.status
            if update.notes:
                risk["notes"] = update.notes
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    # Save updated register
    await db.risk_registers.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "risks": risk_register["risks"],
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Risk updated successfully", "risk_id": risk_id, "status": update.status}

# =============================================================================
# Dashboard Endpoint
# =============================================================================

@api_router.get("/dashboard")
async def get_dashboard(user: User = Depends(get_current_user)):
    """Get comprehensive dashboard data"""
    # Get latest health check
    latest_health_check = await db.health_checks.find_one(
        {"user_id": user.user_id},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    # Get risk register
    risk_register = await db.risk_registers.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    # Get documents
    documents = await db.documents.find(
        {"user_id": user.user_id},
        {"_id": 0, "content_base64": 0}
    ).sort("created_at", -1).to_list(10)
    
    # Calculate risk stats
    risk_stats = {"identified": 0, "mitigating": 0, "resolved": 0, "accepted": 0, "total": 0}
    if risk_register and risk_register.get("risks"):
        for risk in risk_register["risks"]:
            status = risk.get("status", "identified")
            risk_stats[status] = risk_stats.get(status, 0) + 1
            risk_stats["total"] += 1
    
    # Get high priority gaps from latest health check
    priority_actions = []
    if latest_health_check and latest_health_check.get("gaps"):
        for gap in latest_health_check["gaps"][:5]:  # Top 5 gaps
            priority_actions.append({
                "type": "compliance_gap",
                "category": gap["category"],
                "subcategory": gap["subcategory"],
                "description": gap["question"],
                "guidance": gap["guidance"],
                "priority": gap["priority"]
            })
    
    # Add document analysis actions
    pending_docs = [d for d in documents if d.get("analysis_status") == "pending"]
    for doc in pending_docs[:3]:
        priority_actions.append({
            "type": "pending_analysis",
            "category": "Documents",
            "description": f"Analyze document: {doc['filename']}",
            "document_id": doc["id"],
            "priority": "medium"
        })
    
    return {
        "user": user.model_dump(),
        "compliance_score": latest_health_check.get("compliance_score") if latest_health_check else None,
        "gdpr_score": latest_health_check.get("gdpr_score") if latest_health_check else None,
        "cyber_essentials_score": latest_health_check.get("cyber_essentials_score") if latest_health_check else None,
        "risk_level": latest_health_check.get("risk_level") if latest_health_check else None,
        "last_health_check": latest_health_check.get("created_at").isoformat() if latest_health_check and latest_health_check.get("created_at") else None,
        "risk_stats": risk_stats,
        "total_documents": len(documents),
        "analyzed_documents": len([d for d in documents if d.get("analysis_status") == "completed"]),
        "priority_actions": priority_actions,
        "recent_documents": documents[:5]
    }

# =============================================================================
# Subscription Endpoints (Placeholder)
# =============================================================================

@api_router.get("/subscription")
async def get_subscription(user: User = Depends(get_current_user)):
    """Get user's subscription status"""
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    if not subscription:
        # Return free tier by default
        return {
            "plan_type": "free",
            "status": "active",
            "features": {
                "health_checks_per_month": 1,
                "document_analyses_per_month": 3,
                "risk_register": True,
                "priority_support": False,
                "export_reports": False
            }
        }
    
    return subscription

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "currency": "GBP",
                "interval": "month",
                "features": {
                    "health_checks_per_month": 1,
                    "document_analyses_per_month": 3,
                    "risk_register": True,
                    "priority_support": False,
                    "export_reports": False
                },
                "description": "Perfect for getting started with compliance"
            },
            {
                "id": "starter",
                "name": "Starter",
                "price": 29,
                "currency": "GBP",
                "interval": "month",
                "features": {
                    "health_checks_per_month": 5,
                    "document_analyses_per_month": 15,
                    "risk_register": True,
                    "priority_support": False,
                    "export_reports": True
                },
                "description": "For small businesses starting their compliance journey"
            },
            {
                "id": "professional",
                "name": "Professional",
                "price": 79,
                "currency": "GBP",
                "interval": "month",
                "features": {
                    "health_checks_per_month": -1,  # Unlimited
                    "document_analyses_per_month": 50,
                    "risk_register": True,
                    "priority_support": True,
                    "export_reports": True
                },
                "description": "For growing businesses with serious compliance needs"
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 199,
                "currency": "GBP",
                "interval": "month",
                "features": {
                    "health_checks_per_month": -1,
                    "document_analyses_per_month": -1,
                    "risk_register": True,
                    "priority_support": True,
                    "export_reports": True,
                    "dedicated_support": True,
                    "custom_integrations": True
                },
                "description": "For organisations requiring full compliance support"
            }
        ]
    }

# =============================================================================
# Base Routes
# =============================================================================

@api_router.get("/")
async def root():
    return {"message": "ComplyPilot API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
