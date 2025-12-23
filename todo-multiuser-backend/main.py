from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="TODO Multi-User API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[int] = 3
    due_date: Optional[str] = None
    company: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    due_date: Optional[str] = None
    stuck_reason: Optional[str] = None
    completion_remark: Optional[str] = None

class TaskAssign(BaseModel):
    task_id: int
    user_emails: List[str]

# Auth dependency
def get_current_user(token: str):
    try:
        user = supabase.auth.get_user(token)
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/")
def root():
    return {"message": "TODO Multi-User API"}

@app.get("/tasks")
def get_tasks(token: str = None):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    try:
        # Set auth header
        supabase.auth.set_session(token, "")
        response = supabase.table("tasks").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/tasks")
def create_task(task: TaskCreate, token: str = None):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    try:
        user = supabase.auth.get_user(token)
        user_record = supabase.table("users").select("id").eq("user_id", user.user.id).execute()
        
        if not user_record.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        task_data = task.dict()
        task_data["assigned_by"] = user_record.data[0]["id"]
        
        response = supabase.table("tasks").insert(task_data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate, token: str = None):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    try:
        supabase.auth.set_session(token, "")
        response = supabase.table("tasks").update(task.dict(exclude_unset=True)).eq("id", task_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/tasks/assign")
def assign_task(assignment: TaskAssign, token: str = None):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    try:
        # Get user IDs from emails
        users = supabase.table("users").select("id").in_("email", assignment.user_emails).execute()
        
        assignments = []
        for user in users.data:
            assignments.append({
                "task_id": assignment.task_id,
                "user_id": user["id"]
            })
        
        response = supabase.table("task_assignments").insert(assignments).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/notifications")
def get_notifications(token: str = None):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    try:
        supabase.auth.set_session(token, "")
        response = supabase.table("notifications").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)