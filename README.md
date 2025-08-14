# Interactive Budget & Expense Tracker

A responsive web-based budget and expense tracker built with Next.js, Supabase, and Tailwind CSS. Track your income, expenses, set savings goals, and visualize your financial data with interactive charts.

## Features

- 🔐 **User Authentication** - Secure signup/login with Supabase Auth
- 💰 **Transaction Management** - Add, edit, delete income and expense transactions
- 📊 **Visual Analytics** - Interactive pie and bar charts for expense breakdown
- 🎯 **Savings Goals** - Set and track monthly savings targets
- 📱 **Responsive Design** - Mobile-friendly interface
- 🌙 **Dark/Light Mode** - Toggle between themes
- 📂 **Category Management** - Create, edit, and organize transaction categories
- 📅 **Time Filtering** - Filter transactions by month/year
- 💾 **Data Persistence** - All data stored securely in Supabase

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel

## Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd budget-expense-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials

### 4. Set up the database

Run the following SQL commands in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create savings_goals table
CREATE TABLE savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  monthly_goal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies

-- Categories policies
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Savings goals policies
CREATE POLICY "Users can view their own savings goals" ON savings_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings goals" ON savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" ON savings_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" ON savings_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id_date ON transactions(user_id, date DESC);
CREATE INDEX idx_categories_user_id_type ON categories(user_id, type, "order");
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 6. Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

## Usage

1. **Sign Up/Login**: Create an account or sign in with existing credentials
2. **Add Categories**: Use the settings button to create income and expense categories
3. **Add Transactions**: Click "Add Transaction" to record income or expenses
4. **Set Savings Goal**: Set a monthly savings target to track your progress
5. **View Analytics**: Check the charts and summary cards for insights
6. **Filter by Time**: Use the month selector to view different time periods

## Project Structure

```
├── app/
│   ├── components/          # React components
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── lib/
│   └── supabase.ts         # Supabase client and types
├── public/                 # Static assets
└── ...config files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📱 PWA (Progressive Web App) Features

Your budget tracker is now a full PWA! Users can:

### ✅ **Install as Native App**
- **Add to Home Screen** on mobile devices
- **Install from browser** on desktop (Chrome, Edge, etc.)
- **Offline functionality** with service worker caching
- **Native app experience** with custom splash screen

### 🎨 **Custom App Icons**
1. **Navigate to** `/icon-generator.html` in your browser
2. **Download all required icons** (72x72 to 512x512)
3. **Create `/public/icons/` folder**
4. **Save icons** as `icon-72x72.png`, `icon-96x96.png`, etc.
5. **Create maskable icons** for Android adaptive icons

### 📱 **Installation Instructions for Users**

#### **On Mobile (iOS/Android):**
1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap the **Share** button (iOS) or **Menu** (Android)
3. Select **"Add to Home Screen"**
4. Confirm installation

#### **On Desktop (Chrome/Edge):**
1. Look for the **install icon** in the address bar
2. Click **"Install Budget Tracker"**
3. App opens in its own window

### 🚀 **PWA Benefits**
- **Fast loading** with service worker caching
- **Offline access** to previously loaded data
- **Native app feel** with standalone display
- **Push notifications** ready (can be added later)
- **Automatic updates** when you deploy changes

## License

MIT License - feel free to use this project for personal or commercial purposes.