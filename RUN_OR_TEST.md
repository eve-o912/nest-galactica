# 🚀 NEST Platform - Run & Test Guide

## 📋 Prerequisites

### **System Requirements**
- **Node.js**: 18.0+ 
- **pnpm**: Latest version (`npm install -g pnpm`)
- **PostgreSQL**: 16.0+ 
- **Redis**: 7.0+
- **Git**: For version control

### **Optional (Recommended)**
- **Docker**: For easy database setup
- **VS Code**: With TypeScript and Prisma extensions

## 🔧 Quick Setup (5 minutes)

### 1. **Clone & Install**
```bash
git clone <repository-url>
cd nest-platform
pnpm install
```

### 2. **Database Setup**
```bash
# Option 1: Docker (Recommended)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16
docker run -d -p 6379:6379 redis:7-alpine

# Option 2: Local installations
# Start PostgreSQL and Redis services manually
```

### 3. **Environment Configuration**
```bash
# Backend environment
cd apps/api
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Environment Variables:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/nest"
REDIS_URL="redis://localhost:6379"

WDK_NETWORK="testnet"
WDK_API_KEY="your-wdk-api-key"
WDK_RPC_URL="https://testnet.tether.io/rpc"
LENDING_POOL_ADDRESS="0x1234567890123456789012345678901234567890"

GEMINI_API_KEY="your-gemini-api-key"

JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"

NODE_ENV="development"
PORT="3001"
FRONTEND_URL="http://localhost:3000"
```

### 4. **Database Initialization**
```bash
cd apps/api
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. **Start Development**
```bash
# From root directory
pnpm dev
```

**Access Points:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api

## 🧪 Testing Guide

### **1. Health Checks**
```bash
# Backend health
curl http://localhost:3001/health

# WDK integration health
curl http://localhost:3001/api/wdk/health
```

### **2. User Registration & Wallet Creation**
```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@nest.com",
    "password": "password123",
    "name": "Test User",
    "monthlyIncome": "5000",
    "monthlyExpenses": "3000"
  }'

# Login and get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@nest.com",
    "password": "password123"
  }'

# Save the token for subsequent requests
TOKEN="your-jwt-token-here"
```

### **3. Create WDK Wallet**
```bash
curl -X POST http://localhost:3001/api/users/wallet \
  -H "Authorization: Bearer $TOKEN"
```

### **4. Create Savings Goals (Nests)**
```bash
# Emergency fund nest
curl -X POST http://localhost:3001/api/nests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emergency Fund",
    "description": "3-6 months expenses",
    "type": "EMERGENCY",
    "targetAmount": "15000.00"
  }'

# Vacation nest
curl -X POST http://localhost:3001/api/nests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dream Vacation",
    "description": "Trip to Japan",
    "type": "VACATION",
    "targetAmount": "5000.00",
    "deadline": "2024-12-31T23:59:59.000Z"
  }'
```

### **5. Test Deposit & AI Allocation**
```bash
# Deposit funds (triggers AI allocation)
curl -X POST http://localhost:3001/api/nests/emergency-nest/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": "1000.00"}'

# Check allocation results
curl http://localhost:3001/api/nests \
  -H "Authorization: Bearer $TOKEN"

# Check transactions
curl http://localhost:3001/api/transactions \
  -H "Authorization: Bearer $TOKEN"
```

### **6. Test AI Agent**
```bash
# Chat with AI advisor
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How should I allocate my savings between emergency fund and vacation goal?"
  }'

# Check agent decisions
curl http://localhost:3001/api/agent/decisions \
  -H "Authorization: Bearer $TOKEN"
```

### **7. Test Bridge Loan System**
```bash
# Get available loans (AI creates these automatically)
curl http://localhost:3001/api/loans \
  -H "Authorization: Bearer $TOKEN"

# Accept a loan offer
curl -X POST http://localhost:3001/api/loans/loan-123/respond \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accept": true}'

# Check loan status and collateral
curl http://localhost:3001/api/loans \
  -H "Authorization: Bearer $TOKEN"
```

## 🔄 Automated Testing

### **Unit Tests**
```bash
cd apps/api
pnpm test

# With coverage
pnpm test:coverage
```

### **Integration Tests**
```bash
cd apps/api
pnpm test:integration
```

### **E2E Tests**
```bash
cd apps/web
pnpm test:e2e
```

## 🐛 Troubleshooting

### **Common Issues**

#### **1. Database Connection Error**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d nest
```

#### **2. Redis Connection Error**
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

#### **3. WDK API Key Error**
```bash
# Verify WDK credentials
echo $WDK_API_KEY
echo $WDK_NETWORK

# Test WDK health
curl http://localhost:3001/api/wdk/health
```

#### **4. Port Conflicts**
```bash
# Check what's using ports 3000/3001
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Kill processes if needed
kill -9 <PID>
```

#### **5. TypeScript Build Errors**
```bash
# Clean and rebuild
cd apps/api
rm -rf dist
pnpm build

cd apps/web
rm -rf .next
pnpm build
```

### **Log Locations**
```bash
# Backend logs
tail -f apps/api/logs/combined.log
tail -f apps/api/logs/error.log

# Database query logs (development only)
# Check console output
```

## 📱 Frontend Testing

### **Manual Browser Testing**
1. Open http://localhost:3000
2. Create account → Login → Create wallet
3. Create savings goals
4. Test deposit flow
5. Chat with AI advisor
6. Review loan offers

### **Mobile Testing**
- Use browser dev tools mobile simulation
- Test responsive design
- Verify touch interactions

## 🔍 API Testing Tools

### **Postman Collection**
Import this collection for easy API testing:

```json
{
  "info": {
    "name": "NEST Platform API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Signup",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@nest.com\",\n  \"password\": \"password123\",\n  \"name\": \"Test User\"\n}"
            },
            "url": {
              "raw": "http://localhost:3001/api/auth/signup"
            }
          }
        }
      ]
    }
  ]
}
```

### **GraphQL Playground (Future)**
```bash
# When GraphQL is implemented
http://localhost:3001/graphql
```

## 🚀 Production Deployment

### **Docker Deployment**
```bash
# Build and run all services
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose logs -f
```

### **Environment-Specific Setup**
```bash
# Production
NODE_ENV=production pnpm build
pnpm start

# Development
NODE_ENV=development pnpm dev
```

## 📊 Performance Testing

### **Load Testing**
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test-config.yml
```

### **Database Performance**
```bash
# Analyze slow queries
cd apps/api
pnpm db:studio

# Check connection pool
psql -h localhost -U postgres -d nest -c "SELECT * FROM pg_stat_activity;"
```

## 🔧 Development Tools

### **Database Management**
```bash
# Prisma Studio
cd apps/api
pnpm db:studio

# Reset database
pnpm db:reset
```

### **Code Quality**
```bash
# Linting
pnpm lint

# Type checking
pnpm type-check

# Format code
pnpm format
```

---

## 🎯 Success Criteria

Your NEST platform is working correctly when:

✅ **Backend**: API responds without errors  
✅ **Database**: All tables created and seeded  
✅ **WDK Integration**: Health checks pass  
✅ **User Flow**: Complete signup → wallet → goals → deposits  
✅ **AI Agent**: Chat responses and autonomous decisions  
✅ **Loans**: Bridge loan creation and collateral locking  
✅ **Frontend**: Dashboard displays data correctly  

**🎉 Congratulations! Your NEST platform is ready for the Tether WDK hackathon!**
