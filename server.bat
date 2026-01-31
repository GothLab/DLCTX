@echo off
echo Starting HTTP server...
echo Serving files from: %cd%
echo.
echo Open in browser: http://localhost:8000/index.html
echo Press Ctrl+C to stop the server
echo.

start chrome "http://localhost:8000/index.html"
python -m http.server 8000