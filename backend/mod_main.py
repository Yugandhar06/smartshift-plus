import re

path = r'C:\Users\23000\Desktop\ssp\backend\main.py'
with open(path, 'r') as f:
    text = f.read()

if 'from routers import ' in text and ' shift,' not in text:
    text = text.replace('from routers import ', 'from routers import shift, ')

if 'app.include_router(shift.router)' not in text:
    text = text.replace('app.include_router(zones.router)', 'app.include_router(shift.router)\napp.include_router(zones.router)')

with open(path, 'w') as f:
    f.write(text)