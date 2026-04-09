/**
 * Seed script — inserts realistic demo data into all collections.
 * Run: node scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Transaction = require('../models/Transaction');
const Budget      = require('../models/Budget');
const Khata       = require('../models/Khata');
const Community   = require('../models/Community');
const SuccessStory = require('../models/SuccessStory');

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) { console.error('❌ MONGO_URL not set'); process.exit(1); }

// ─── helpers ────────────────────────────────────────────────────────────────
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const monthStr = (offset = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Transactions ────────────────────────────────────────────────────────────
const transactions = [
    // Income
    { type: 'income', amount: 45000, category: 'Salary',     text: 'Monthly salary - June',       notes: 'Net salary after TDS',          date: daysAgo(2),  source: 'manual' },
    { type: 'income', amount: 8500,  category: 'Freelance',  text: 'Logo design project',          notes: 'Client: Sharma Enterprises',    date: daysAgo(8),  source: 'manual' },
    { type: 'income', amount: 3200,  category: 'Investment', text: 'Mutual fund dividend',         notes: 'HDFC Balanced Advantage Fund',  date: daysAgo(12), source: 'manual' },
    { type: 'income', amount: 45000, category: 'Salary',     text: 'Monthly salary - May',         notes: 'Net salary after TDS',          date: daysAgo(32), source: 'manual' },
    { type: 'income', amount: 5000,  category: 'Bonus',      text: 'Performance bonus Q1',         notes: 'Quarterly incentive',           date: daysAgo(35), source: 'manual' },
    { type: 'income', amount: 12000, category: 'Business',   text: 'Consulting fees',              notes: 'Tax advisory for 3 clients',    date: daysAgo(40), source: 'manual' },
    { type: 'income', amount: 45000, category: 'Salary',     text: 'Monthly salary - April',       notes: 'Net salary after TDS',          date: daysAgo(62), source: 'manual' },
    { type: 'income', amount: 2800,  category: 'Investment', text: 'Stock dividend - TCS',         notes: 'Quarterly dividend',            date: daysAgo(55), source: 'manual' },

    // Expenses — current month
    { type: 'expense', amount: 12000, category: 'Housing',        text: 'House rent - June',           notes: '2BHK Pune',                     date: daysAgo(1),  source: 'manual' },
    { type: 'expense', amount: 3800,  category: 'Food & Dining',  text: 'Monthly groceries',           notes: 'Big Bazaar + local market',     date: daysAgo(3),  source: 'manual' },
    { type: 'expense', amount: 1200,  category: 'Transportation', text: 'Petrol - June',               notes: 'Honda Activa',                  date: daysAgo(4),  source: 'manual' },
    { type: 'expense', amount: 850,   category: 'Utilities',      text: 'Electricity bill',            notes: 'MSEDCL June bill',              date: daysAgo(5),  source: 'manual' },
    { type: 'expense', amount: 499,   category: 'Entertainment',  text: 'Netflix subscription',        notes: 'Monthly plan',                  date: daysAgo(6),  source: 'manual' },
    { type: 'expense', amount: 2200,  category: 'Shopping',       text: 'Clothes - summer sale',       notes: 'Myntra order',                  date: daysAgo(7),  source: 'manual' },
    { type: 'expense', amount: 600,   category: 'Food & Dining',  text: 'Dinner - Barbeque Nation',    notes: 'Family outing',                 date: daysAgo(9),  source: 'manual' },
    { type: 'expense', amount: 1500,  category: 'Healthcare',     text: 'Doctor consultation + meds',  notes: 'Dr. Mehta clinic',              date: daysAgo(10), source: 'manual' },
    { type: 'expense', amount: 3000,  category: 'Education',      text: 'Online course - React',       notes: 'Udemy annual subscription',     date: daysAgo(11), source: 'manual' },
    { type: 'expense', amount: 400,   category: 'Food & Dining',  text: 'Swiggy orders',               notes: 'Lunch deliveries this week',    date: daysAgo(13), source: 'manual' },
    { type: 'expense', amount: 750,   category: 'Transportation', text: 'Ola/Uber rides',              notes: 'Office commute',                date: daysAgo(14), source: 'manual' },
    { type: 'expense', amount: 5500,  category: 'Insurance',      text: 'Health insurance premium',    notes: 'Star Health - quarterly',       date: daysAgo(15), source: 'manual' },

    // Expenses — last month
    { type: 'expense', amount: 12000, category: 'Housing',        text: 'House rent - May',            notes: '2BHK Pune',                     date: daysAgo(31), source: 'manual' },
    { type: 'expense', amount: 4200,  category: 'Food & Dining',  text: 'Monthly groceries - May',     notes: 'Big Bazaar',                    date: daysAgo(33), source: 'manual' },
    { type: 'expense', amount: 1100,  category: 'Transportation', text: 'Petrol - May',                notes: 'Honda Activa',                  date: daysAgo(36), source: 'manual' },
    { type: 'expense', amount: 920,   category: 'Utilities',      text: 'Electricity + water bill',    notes: 'May bills',                     date: daysAgo(38), source: 'manual' },
    { type: 'expense', amount: 1800,  category: 'Shopping',       text: 'Amazon purchases',            notes: 'Electronics accessories',       date: daysAgo(42), source: 'manual' },
    { type: 'expense', amount: 2500,  category: 'Travel',         text: 'Weekend trip to Lonavala',    notes: 'Hotel + fuel',                  date: daysAgo(45), source: 'manual' },
    { type: 'expense', amount: 350,   category: 'Entertainment',  text: 'Movie tickets',               notes: 'PVR - 2 tickets',               date: daysAgo(48), source: 'manual' },
    { type: 'expense', amount: 800,   category: 'Healthcare',     text: 'Pharmacy',                    notes: 'Monthly medicines',             date: daysAgo(50), source: 'manual' },

    // Expenses — 2 months ago
    { type: 'expense', amount: 12000, category: 'Housing',        text: 'House rent - April',          notes: '2BHK Pune',                     date: daysAgo(61), source: 'manual' },
    { type: 'expense', amount: 3600,  category: 'Food & Dining',  text: 'Monthly groceries - April',   notes: 'Big Bazaar',                    date: daysAgo(63), source: 'manual' },
    { type: 'expense', amount: 6000,  category: 'Education',      text: 'Daughter school fees',        notes: 'Q1 tuition fees',               date: daysAgo(65), source: 'manual' },
    { type: 'expense', amount: 1400,  category: 'Transportation', text: 'Petrol + parking',            notes: 'April',                         date: daysAgo(68), source: 'manual' },
    { type: 'expense', amount: 3200,  category: 'Shopping',       text: 'Gudi Padwa shopping',         notes: 'New clothes for festival',      date: daysAgo(70), source: 'manual' },
];

// ─── Budgets ─────────────────────────────────────────────────────────────────
const budgets = [
    { category: 'Food & Dining',  monthlyLimit: 5000,  month: monthStr(0) },
    { category: 'Transportation', monthlyLimit: 2500,  month: monthStr(0) },
    { category: 'Housing',        monthlyLimit: 13000, month: monthStr(0) },
    { category: 'Entertainment',  monthlyLimit: 1500,  month: monthStr(0) },
    { category: 'Shopping',       monthlyLimit: 3000,  month: monthStr(0) },
    { category: 'Healthcare',     monthlyLimit: 3000,  month: monthStr(0) },
    { category: 'Utilities',      monthlyLimit: 1500,  month: monthStr(0) },
    { category: 'Education',      monthlyLimit: 4000,  month: monthStr(0) },
    { category: 'Food & Dining',  monthlyLimit: 5000,  month: monthStr(-1) },
    { category: 'Transportation', monthlyLimit: 2500,  month: monthStr(-1) },
    { category: 'Housing',        monthlyLimit: 13000, month: monthStr(-1) },
    { category: 'Shopping',       monthlyLimit: 3000,  month: monthStr(-1) },
];

// ─── Khata (Ledger) ───────────────────────────────────────────────────────────
const khataParties = [
    {
        name: 'Ramesh Sharma',
        phone: '9876543210',
        entries: [
            { type: 'gave', amount: 5000,  note: 'Business loan',        date: daysAgo(30) },
            { type: 'gave', amount: 2000,  note: 'Emergency help',       date: daysAgo(15) },
            { type: 'got',  amount: 3000,  note: 'Partial repayment',    date: daysAgo(5)  },
        ]
    },
    {
        name: 'Priya Patel',
        phone: '9123456780',
        entries: [
            { type: 'gave', amount: 8000,  note: 'Lent for shop setup',  date: daysAgo(60) },
            { type: 'got',  amount: 4000,  note: 'First installment',    date: daysAgo(30) },
            { type: 'got',  amount: 4000,  note: 'Final payment',        date: daysAgo(10) },
        ]
    },
    {
        name: 'Suresh Mehta',
        phone: '9988776655',
        entries: [
            { type: 'got',  amount: 3500,  note: 'Borrowed for travel',  date: daysAgo(20) },
            { type: 'gave', amount: 1000,  note: 'Returned partial',     date: daysAgo(8)  },
        ]
    },
    {
        name: 'Anita Desai',
        phone: '9765432109',
        entries: [
            { type: 'gave', amount: 15000, note: 'Wedding gift loan',    date: daysAgo(90) },
            { type: 'got',  amount: 5000,  note: 'Repayment 1',          date: daysAgo(60) },
            { type: 'got',  amount: 5000,  note: 'Repayment 2',          date: daysAgo(30) },
            { type: 'got',  amount: 5000,  note: 'Final repayment ✓',    date: daysAgo(5)  },
        ]
    },
    {
        name: 'Vikram Joshi',
        phone: '9654321098',
        entries: [
            { type: 'gave', amount: 2500,  note: 'Grocery advance',      date: daysAgo(10) },
        ]
    },
];

// ─── Communities ─────────────────────────────────────────────────────────────
const communities = [
    {
        name: 'Rural Entrepreneurs Network',
        description: 'A community for small business owners in rural Maharashtra to share ideas, get advice, and grow together.',
        members: ['user_demo1', 'user_demo2', 'user_demo3', 'user_demo4'],
        owner: 'user_demo1'
    },
    {
        name: 'Women in Finance',
        description: 'Empowering women with financial literacy, investment tips, and business guidance.',
        members: ['user_demo2', 'user_demo5', 'user_demo6'],
        owner: 'user_demo2'
    },
    {
        name: 'Farmers Investment Club',
        description: 'Helping farmers invest surplus income wisely through SIPs, gold, and government schemes.',
        members: ['user_demo3', 'user_demo7', 'user_demo8', 'user_demo9'],
        owner: 'user_demo3'
    },
    {
        name: 'Young Savers India',
        description: 'For 18–30 year olds learning to save, invest, and build wealth from scratch.',
        members: ['user_demo4', 'user_demo5', 'user_demo10'],
        owner: 'user_demo4'
    },
];

// ─── Success Stories ─────────────────────────────────────────────────────────
const successStories = [
    {
        title: 'From ₹500 to ₹5 Lakh: My SIP Journey',
        author: 'Kavita Rane',
        region: 'Nashik, Maharashtra',
        sector: 'Investment',
        challenge: 'I was a homemaker with no savings and no knowledge of investing. My husband\'s income was our only source and we had no financial safety net.',
        summary: 'Started a ₹500/month SIP in 2019 and grew it to ₹5 lakh corpus in 4 years by gradually increasing contributions.',
        fullStory: 'In 2019, I attended a financial literacy workshop in Nashik. I had never invested before and was scared of losing money. The advisor suggested starting small — just ₹500/month in a balanced mutual fund. I set up an auto-debit and forgot about it. Six months later, I checked and saw ₹3,200 — more than I put in! That motivated me to increase to ₹1,000/month. By 2021, I was investing ₹3,000/month across 3 funds. Today my portfolio is worth ₹5.2 lakh. I also started teaching other women in my neighbourhood about SIPs.',
        keyLessons: ['Start small, start today', 'Increase SIP amount every year', 'Don\'t panic during market dips', 'Diversify across 2-3 funds'],
        thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop',
        likes: 142,
        views: 1840,
        date: '2024-03-15',
        hasVideo: false
    },
    {
        title: 'How I Built a Dairy Business with a ₹50,000 Loan',
        author: 'Santosh Patil',
        region: 'Kolhapur, Maharashtra',
        sector: 'Agriculture',
        challenge: 'I had 2 cows and no capital to expand. Banks rejected my loan application twice due to lack of collateral.',
        summary: 'Used a government MUDRA loan to buy 3 more cows, set up a small dairy unit, and now earns ₹40,000/month.',
        fullStory: 'After two bank rejections, I learned about the Pradhan Mantri MUDRA Yojana through this app. I applied for a Kishore loan of ₹50,000. With that money I bought 3 more cows and a small milk chilling unit. I started supplying to a local dairy cooperative. Within 8 months I repaid the loan. Now I have 12 cows, supply 80 litres/day, and earn ₹40,000/month net. I have also hired 2 local workers.',
        keyLessons: ['Research government schemes before approaching private lenders', 'Start with a clear business plan', 'Repay loans on time to build credit history', 'Reinvest profits to scale'],
        thumbnail: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&auto=format&fit=crop',
        likes: 98,
        views: 1230,
        date: '2024-01-20',
        hasVideo: false
    },
    {
        title: 'Debt-Free in 2 Years: My Story',
        author: 'Meena Kulkarni',
        region: 'Pune, Maharashtra',
        sector: 'Personal Finance',
        challenge: 'Had ₹1.8 lakh in credit card debt across 3 cards with 36% annual interest. Minimum payments were barely covering interest.',
        summary: 'Used the debt avalanche method and strict budgeting to become completely debt-free in 22 months.',
        fullStory: 'I was paying ₹4,500/month in minimum payments but my debt wasn\'t reducing. I found the debt avalanche strategy — pay minimums on all cards, throw every extra rupee at the highest-interest card first. I cut all subscriptions, stopped eating out, and took on weekend freelance work. I paid off the first card in 6 months, the second in 4 more months, and the last one in 12 months. The psychological relief was incredible. Now I invest ₹8,000/month that was previously going to interest.',
        keyLessons: ['List all debts with interest rates', 'Attack highest interest debt first', 'Every extra rupee matters', 'Celebrate small wins to stay motivated'],
        thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop',
        likes: 215,
        views: 2760,
        date: '2024-02-10',
        hasVideo: false
    },
    {
        title: 'Poultry Farm to ₹1 Crore Business',
        author: 'Rajendra Bhosale',
        region: 'Solapur, Maharashtra',
        sector: 'Agriculture',
        challenge: 'Started with 200 chickens and a small shed. No market connections, no cold storage, and high mortality rates.',
        summary: 'Scaled a backyard poultry operation to a 10,000-bird commercial farm supplying 5 districts in 6 years.',
        fullStory: 'I started with 200 broiler chickens in 2018 with ₹80,000 borrowed from family. The first batch had 15% mortality — I nearly quit. I joined a poultry farmers WhatsApp group and learned about vaccination schedules and feed ratios. By batch 3, mortality dropped to 3%. I reinvested every profit. By 2020 I had 2,000 birds. I got a ₹5 lakh loan under the Animal Husbandry Infrastructure Development Fund. Today I have 10,000 birds, my own cold storage, and supply to hotels and retailers across 5 districts. Annual turnover crossed ₹1 crore last year.',
        keyLessons: ['Learn from failures, don\'t quit after first setback', 'Join farmer networks and communities', 'Government schemes exist — find them', 'Vertical integration (own cold storage) increases margins'],
        thumbnail: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&auto=format&fit=crop',
        likes: 187,
        views: 3100,
        date: '2023-11-05',
        hasVideo: false
    },
    {
        title: 'How I Saved ₹2 Lakh for My Child\'s Education',
        author: 'Sunita Jadhav',
        region: 'Aurangabad, Maharashtra',
        sector: 'Savings',
        challenge: 'Single mother, earning ₹18,000/month as a school teacher. Wanted to save for daughter\'s engineering college fees in 5 years.',
        summary: 'Combined PPF, Sukanya Samriddhi Yojana, and RD to build a ₹2 lakh education fund in 5 years on a modest income.',
        fullStory: 'When my daughter was in 7th standard, I started planning for her engineering fees. I opened a Sukanya Samriddhi account and deposited ₹1,500/month. I also started a ₹1,000/month RD at the post office. I cut my mobile plan, stopped buying new clothes for myself, and cooked at home every day. In year 3, I got a small salary increment and added ₹500/month to PPF. By the time my daughter got admission, I had ₹2.1 lakh saved — enough for the first year\'s fees. She got a scholarship for the remaining years. The discipline I built also helped me start a ₹2,000/month SIP for my retirement.',
        keyLessons: ['Start saving for goals early', 'Use government-backed schemes for safety', 'Small consistent amounts beat large irregular ones', 'Every lifestyle cut is an investment in your future'],
        thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop',
        likes: 163,
        views: 2050,
        date: '2024-04-02',
        hasVideo: false
    },
];

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed() {
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
        Transaction.deleteMany({}),
        Budget.deleteMany({}),
        Khata.deleteMany({}),
        Community.deleteMany({}),
        SuccessStory.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Insert fresh data
    await Transaction.insertMany(transactions);
    console.log(`✅ Inserted ${transactions.length} transactions`);

    await Budget.insertMany(budgets);
    console.log(`✅ Inserted ${budgets.length} budgets`);

    await Khata.insertMany(khataParties);
    console.log(`✅ Inserted ${khataParties.length} khata parties`);

    await Community.insertMany(communities);
    console.log(`✅ Inserted ${communities.length} communities`);

    await SuccessStory.insertMany(successStories);
    console.log(`✅ Inserted ${successStories.length} success stories`);

    console.log('\n🎉 Seed complete! Your database is now populated.');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
