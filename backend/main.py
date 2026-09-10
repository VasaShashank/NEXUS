"""
Vercel / Production entrypoint for NEXUS backend.
Imports the FastAPI instance from app.main.
"""
import sys
import os

# Ensure backend directory is in sys.path for absolute imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
