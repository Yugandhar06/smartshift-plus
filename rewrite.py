
with open('dashboard/src/pages/WorkerApp.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('return (')
before_return = content[:start]

with open('dashboard/src/pages/WorkerApp.jsx', 'w', encoding='utf-8') as f:
    f.write(before_return)

