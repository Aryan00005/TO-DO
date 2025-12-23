from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
import jwt
import bcrypt
import smtplib
import random
import httpx
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="TODO Multi-User API - Supabase Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

security = HTTPBearer()

# Models
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    user_id: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[int] = 3
    due_date: Optional[str] = None
    company: Optional[str] = None
    assigned_to: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    due_date: Optional[str] = None
    stuck_reason: Optional[str] = None
    completion_remark: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ForgotPassword(BaseModel):
    email: str

class ResetPassword(BaseModel):
    email: str
    otp: str
    new_password: str

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_data: dict) -> str:
    payload = {
        "user_id": user_data["id"],
        "email": user_data["email"],
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    
    user = supabase.table("users").select("*").eq("id", payload["user_id"]).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user.data[0]

def send_email(to_email: str, subject: str, body: str):
    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = os.getenv("MAIL_USER")
        msg['To'] = to_email
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(os.getenv("MAIL_USER"), os.getenv("MAIL_PASS"))
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"Email error: {e}")

# Auth Routes
@app.get("/auth/google")
async def google_login():
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/auth?"
        f"client_id={os.getenv('GOOGLE_CLIENT_ID')}&"
        f"redirect_uri=http://localhost:{os.getenv('PORT', 8002)}/auth/google/callback&"
        f"scope=openid email profile&"
        f"response_type=code"
    )
    return RedirectResponse(url=google_auth_url)

@app.get("/auth/google/callback")
async def google_callback(code: str):
    # Exchange code for token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": f"http://localhost:{os.getenv('PORT', 8002)}/auth/google/callback"
    }
    
    async with httpx.AsyncClient() as client:
        token_response = await client.post(token_url, data=token_data)
        token_json = token_response.json()
        
        if "access_token" not in token_json:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        # Get user info
        user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={token_json['access_token']}"
        user_response = await client.get(user_info_url)
        user_data = user_response.json()
    
    # Check if user exists
    existing_user = supabase.table("users").select("*").eq("email", user_data["email"]).execute()
    
    if existing_user.data:
        # User exists, log them in
        user_record = existing_user.data[0]
        token = create_jwt_token(user_record)
        
        # Redirect to frontend with token
        frontend_url = f"{os.getenv('FRONTEND_URL')}/dashboard?token={token}"
        return RedirectResponse(url=frontend_url)
    else:
        # New user, create account
        new_user = {
            "name": user_data["name"],
            "email": user_data["email"],
            "auth_provider": "google",
            "account_status": "incomplete"  # Need to complete account
        }
        
        result = supabase.table("users").insert(new_user).execute()
        
        if result.data:
            # Redirect to account completion
            frontend_url = f"{os.getenv('FRONTEND_URL')}/complete-account?email={user_data['email']}"
            return RedirectResponse(url=frontend_url)
    
    raise HTTPException(status_code=400, detail="Google authentication failed")

@app.post("/auth/register")
def register(user: UserRegister):
    # Check if user exists
    existing = supabase.table("users").select("id").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_data = {
        "name": user.name,
        "email": user.email,
        "user_id": user.user_id,
        "password": hash_password(user.password),
        "auth_provider": "local",
        "account_status": "active"
    }
    
    result = supabase.table("users").insert(user_data).execute()
    
    if result.data:
        token = create_jwt_token(result.data[0])
        return {"token": token, "user": result.data[0]}
    
    raise HTTPException(status_code=400, detail="Registration failed")

@app.post("/auth/login")
def login(credentials: UserLogin):
    # Find user by email or user_id
    user = supabase.table("users").select("*").eq("email", credentials.email).execute()
    
    if not user.data:
        user = supabase.table("users").select("*").eq("user_id", credentials.email).execute()
    
    if not user.data or not verify_password(credentials.password, user.data[0]["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_data = user.data[0]
    token = create_jwt_token(user_data)
    
    # Send login notification
    if os.getenv("SEND_LOGIN_EMAILS") == "true":
        send_email(
            user_data["email"],
            "Login Notification",
            f"Hello {user_data['name']}, you just logged into your account."
        )
    
    return {"token": token, "user": user_data}

@app.post("/auth/change-password")
def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(data.new_password)
    
    supabase.table("users").update({"password": new_hash}).eq("id", current_user["id"]).execute()
    
    return {"message": "Password changed successfully"}

@app.post("/auth/forgot-password")
def forgot_password(data: ForgotPassword):
    user = supabase.table("users").select("*").eq("email", data.email).execute()
    
    if not user.data:
        raise HTTPException(status_code=404, detail="Email not found")
    
    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=15)
    
    supabase.table("users").update({
        "reset_token": otp,
        "reset_token_expiry": expiry.isoformat(),
        "reset_attempts": 0,
        "last_reset_attempt": datetime.utcnow().isoformat()
    }).eq("email", data.email).execute()
    
    send_email(
        data.email,
        "Password Reset OTP",
        f"Your password reset OTP is: {otp}. Valid for 15 minutes."
    )
    
    return {"message": "OTP sent to email"}

@app.post("/auth/reset-password")
def reset_password(data: ResetPassword):
    user = supabase.table("users").select("*").eq("email", data.email).execute()
    
    if not user.data:
        raise HTTPException(status_code=404, detail="Email not found")
    
    user_data = user.data[0]
    
    if (user_data["reset_token"] != data.otp or 
        datetime.fromisoformat(user_data["reset_token_expiry"]) < datetime.utcnow()):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    new_hash = hash_password(data.new_password)
    
    supabase.table("users").update({
        "password": new_hash,
        "reset_token": None,
        "reset_token_expiry": None
    }).eq("email", data.email).execute()
    
    return {"message": "Password reset successfully"}

# Task Routes
@app.get("/tasks/assignedTo/{user_id}")
def get_assigned_tasks(user_id: int, current_user: dict = Depends(get_current_user)):
    # Get tasks assigned to user
    assignments = supabase.table("task_assignments").select("""
        *,
        tasks:task_id (
            *,
            users:assigned_by (name, email)
        )
    """).eq("user_id", user_id).execute()
    
    return assignments.data

@app.get("/tasks/assignedBy/{user_id}")
def get_created_tasks(user_id: int, current_user: dict = Depends(get_current_user)):
    # Get tasks created by user
    tasks = supabase.table("tasks").select("""
        *,
        task_assignments (
            *,
            users:user_id (name, email)
        )
    """).eq("assigned_by", user_id).execute()
    
    return tasks.data

@app.post("/tasks")
def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    # Create task
    task_data = {
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "due_date": task.due_date,
        "company": task.company,
        "assigned_by": current_user["id"]
    }
    
    result = supabase.table("tasks").insert(task_data).execute()
    
    if result.data and task.assigned_to:
        task_id = result.data[0]["id"]
        
        # Get user IDs from emails
        users = supabase.table("users").select("id").in_("email", task.assigned_to).execute()
        
        # Create assignments
        assignments = []
        for user in users.data:
            assignments.append({
                "task_id": task_id,
                "user_id": user["id"]
            })
        
        if assignments:
            supabase.table("task_assignments").insert(assignments).execute()
            
            # Create notifications
            notifications = []
            for user in users.data:
                notifications.append({
                    "user_id": user["id"],
                    "message": f"New task assigned: {task.title}"
                })
            
            supabase.table("notifications").insert(notifications).execute()
    
    return result.data[0] if result.data else None

@app.patch("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate, current_user: dict = Depends(get_current_user)):
    # Update task
    update_data = task.dict(exclude_unset=True)
    
    result = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
    
    return result.data[0] if result.data else None

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, current_user: dict = Depends(get_current_user)):
    # Check if user owns the task
    task = supabase.table("tasks").select("assigned_by").eq("id", task_id).execute()
    
    if not task.data or task.data[0]["assigned_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")
    
    supabase.table("tasks").delete().eq("id", task_id).execute()
    
    return {"message": "Task deleted successfully"}

# Notification Routes
@app.get("/notifications")
def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = supabase.table("notifications").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).execute()
    
    return notifications.data

@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: dict = Depends(get_current_user)):
    supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", current_user["id"]).execute()
    
    return {"message": "Notification marked as read"}

@app.get("/")
def root():
    return {"message": "TODO Multi-User API - Supabase Edition", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8002)))