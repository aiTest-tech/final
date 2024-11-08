# run.sh
#!/bin/bash

# Start the backend server with Gunicorn
echo "Starting backend with Gunicorn..."
(cd backend && gunicorn -w 4 -b 10.10.2.179:6162 test:app) &

# Start the frontend with Vite
echo "Starting frontend with Vite..."
(cd frontend && npm run dev -- --host 0.0.0.0) &

wait
