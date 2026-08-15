@echo off
chcp 65001 >nul
echo === Chinese Traditional Wisdom AI Agent Workflow - Setup ===
echo.

echo [1/3] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo WARNING: pip install failed
)

echo [2/3] Installing Node.js dependencies...
if exist package.json (
    call npm install 2>nul
)

echo [3/3] Setup complete!
echo.
echo Quick start:
echo   python scripts/bazi_calc.py 1990-05-15 --gender male --hour 15
echo   python scripts/yunqi_calc.py 2026
echo   python scripts/full_consultation.py 1990-05-15
echo.
echo Or run the Web Dashboard: cd apps/visual ^&^& pnpm dev
pause
