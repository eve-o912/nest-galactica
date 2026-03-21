@echo off
echo 🚀 Starting NEST Platform Development Environment
echo ================================================

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ pnpm is not installed. Please install pnpm first:
    echo npm install -g pnpm
    pause
    exit /b 1
)

echo.
echo 📦 Installing dependencies...
pnpm install

echo.
echo 🗄️ Setting up database...
cd apps/api
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️ Please edit apps/api\.env with your API keys
)

REM Generate Prisma client
pnpm db:generate

REM Run migrations (if needed)
pnpm db:migrate || echo ⚠️ Database migrations may need manual setup

echo.
echo 🔧 Building projects...
cd ..\..
pnpm build

echo.
echo 🌐 Starting development servers...
echo    API: http://localhost:3001
echo    Web: http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers

REM Start both servers in parallel
pnpm dev
