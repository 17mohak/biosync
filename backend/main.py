"""
main.py
=======
Thin entry-point consumed by uvicorn:

    uvicorn main:app --reload

All application logic lives inside the ``app`` package.
"""

from app import create_app

app = create_app()