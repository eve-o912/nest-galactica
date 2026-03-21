# 🏡 Nest - AI-Powered Financial Platform

A complete financial management platform with AI-driven goal setting, automated savings allocation, and intelligent bridge loans.

## ✨ Features

### 🤖 AI Financial Advisor
- **Gemini Integration**: Real-time personalized financial advice
- **Autonomous Decisions**: Automatic goal rebalancing and loan offers
- **Smart Allocation**: AI-driven deposit distribution across goals

### 💰 Multi-Goal Savings
- **Goal Types**: Emergency, Wedding, Vacation, House, Car, Education, Retirement
- **Priority-Based**: Smart allocation based on urgency and importance
- **Progress Tracking**: Visual progress bars and deadline alerts

### 🌉 Bridge Loans
- **Automatic Offers**: AI detects when goals need funding boosts
- **Collateral-Based**: Uses existing savings as collateral
- **Flexible Terms**: Custom APR and duration based on risk profile

### 🔗 Blockchain Integration
- **WDK Integration**: Tether Wallet Development Kit for USDT transactions
- **Non-Custodial**: Users control their own wallet keys
- **Real Transactions**: Actual blockchain deposits and loan disbursements

## 🏗️ Architecture

### Backend (Node.js + Express + Prisma)
- **Database**: SQLite with Prisma ORM
- **AI**: Google Gemini for financial advice
- **Blockchain**: WDK for USDT operations
- **API**: RESTful endpoints for all operations

### Frontend (Next.js + TypeScript + Tailwind)
- **Modern UI**: Responsive design with Tailwind CSS
- **Real-time**: Live updates and notifications
- **Components**: Modular React components
- **State Management**: Zustand for global state

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Gemini API key (for AI features)

### Backend Setup

```bash
cd nest/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd nest/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

**Backend (.env)**:
```bash
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=your-gemini-api-key-here
WDK_NETWORK=testnet
WDK_API_KEY=your-wdk-api-key
LENDING_POOL_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
PORT=3001
```

**Frontend (.env.local)**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📊 Database Schema

### Core Models
- **User**: Profile, wallet, financial data
- **Goal**: Savings goals with priorities and deadlines
- **Deposit**: Transaction records with goal allocations
- **Loan**: Bridge loans with repayment schedules
- **Message**: AI chat history
- **AgentDecision**: AI decision audit trail

## 🔧 API Endpoints

### Authentication
- `POST /api/signup` - Create new user and wallet
- `POST /api/login` - Authenticate user

### Goals
- `GET /api/goals/:userId` - List user goals
- `POST /api/goals` - Create new goal

### Deposits
- `POST /api/deposit` - Process deposit with allocation

### Loans
- `GET /api/loans/:userId` - List user loans
- `POST /api/loans/:loanId/accept` - Accept bridge loan
- `POST /api/loans/:loanId/repay` - Make loan payment

### Chat
- `POST /api/chat` - Send message to AI advisor
- `GET /api/chat/:userId` - Get chat history

### Dashboard
- `GET /api/dashboard/:userId` - Complete dashboard data

## 🤖 AI Agent Features

### Autonomous Decisions
1. **Goal Analysis**: Monitors goal progress and deadlines
2. **Bridge Loan Offers**: Automatically offers loans when goals need funding
3. **Allocation Rebalancing**: Adjusts deposit percentages based on priorities
4. **Risk Assessment**: Calculates user risk scores for loan terms

### Financial Advisor
- **Context-Aware**: Uses user's financial data for personalized advice
- **Goal-Oriented**: Focuses on emergency funds, debt reduction, and goal achievement
- **Real-Time**: Instant responses to financial questions

## 💡 How It Works

### 1. User Onboarding
- User signs up and gets a non-custodial wallet
- AI analyzes financial situation and sets initial allocations

### 2. Goal Creation
- Users create savings goals with targets and deadlines
- AI assigns priorities and allocation percentages

### 3. Smart Deposits
- Deposits are automatically distributed across goals
- Allocation follows AI recommendations based on priorities

### 4. Bridge Loans
- AI detects when goals need funding boosts
- Offers loans with collateral from existing savings
- Flexible terms based on user risk profile

### 5. Ongoing Management
- AI continuously monitors and rebalances
- Provides real-time financial advice
- Automatically handles loan repayments

## 🔒 Security

- **Non-Custodial Wallets**: Users control their private keys
- **Encrypted Backups**: Wallet backups are encrypted
- **Secure API**: HTTPS and input validation
- **Risk-Based Lending**: Collateral requirements protect users

## 🧪 Testing

### Backend Tests
```bash
cd nest/backend
npm test
```

### Frontend Tests
```bash
cd nest/frontend
npm test
```

### Database Management
```bash
# View database
npx prisma studio

# Reset database
npx prisma db push --force-reset
```

## 🚀 Deployment

### Backend
- Use PM2 for process management
- Set up proper environment variables
- Configure reverse proxy (nginx)

### Frontend
- Build with `npm run build`
- Deploy to Vercel, Netlify, or similar
- Set up environment variables

## 📈 Roadmap

### Phase 1 ✅ (Current)
- Basic goal management
- AI financial advisor
- Bridge loans
- WDK integration

### Phase 2 (Upcoming)
- Mobile apps (iOS/Android)
- Advanced analytics
- Investment options
- Multi-currency support

### Phase 3 (Future)
- DeFi integration
- Community features
- Advanced AI models
- Enterprise features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check this README and code comments
- **Issues**: Open an issue on GitHub
- **Discord**: Join our community server

---

Built with ❤️ by the Nest Team
