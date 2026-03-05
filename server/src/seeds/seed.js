const mongoose = require('mongoose');
const User = require('../models/User');
const Scheme = require('../models/Scheme');
const { mongoUri } = require('../config/env');

const defaultSchemes = [
  // LIC - Life Insurance
  {
    name: 'LIC Jeevan Anand',
    type: 'Life',
    company: 'LIC',
    description: 'Endowment plan with life cover continuing after maturity',
    premiumFrequencies: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    minCoverageAmount: 100000,
    maxCoverageAmount: 10000000,
    minMaturityPeriodYears: 15,
    maxMaturityPeriodYears: 35,
    minEntryAge: 18,
    maxEntryAge: 50,
    features: ['Maturity Benefit', 'Death Benefit', 'Bonus', 'Loan Facility'],
  },
  {
    name: 'LIC Jeevan Labh',
    type: 'Life',
    company: 'LIC',
    description: 'Limited premium paying endowment plan',
    premiumFrequencies: ['yearly', 'half-yearly', 'quarterly'],
    minCoverageAmount: 200000,
    maxCoverageAmount: 10000000,
    minMaturityPeriodYears: 16,
    maxMaturityPeriodYears: 25,
    minEntryAge: 8,
    maxEntryAge: 59,
    features: ['Guaranteed Addition', 'Loyalty Addition', 'Death Benefit', 'Maturity Benefit'],
  },
  {
    name: 'LIC Endowment Plan',
    type: 'Life',
    company: 'LIC',
    description: 'Traditional endowment plan with savings and protection',
    premiumFrequencies: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    minCoverageAmount: 100000,
    maxCoverageAmount: 10000000,
    minMaturityPeriodYears: 12,
    maxMaturityPeriodYears: 35,
    minEntryAge: 8,
    maxEntryAge: 55,
    features: ['Maturity Benefit', 'Death Benefit', 'Bonus', 'Tax Benefits'],
  },
  {
    name: 'LIC Term Plan (Jeevan Amar)',
    type: 'Life',
    company: 'LIC',
    description: 'Pure term insurance plan with affordable premium',
    premiumFrequencies: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    minCoverageAmount: 2500000,
    maxCoverageAmount: 50000000,
    minMaturityPeriodYears: 10,
    maxMaturityPeriodYears: 40,
    minEntryAge: 18,
    maxEntryAge: 65,
    features: ['High Coverage', 'Low Premium', 'Death Benefit Only', 'Tax Benefits'],
  },
  {
    name: 'LIC Money Back Plan',
    type: 'Life',
    company: 'LIC',
    description: 'Money back plan with periodic survival benefits',
    premiumFrequencies: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    minCoverageAmount: 100000,
    maxCoverageAmount: 10000000,
    minMaturityPeriodYears: 15,
    maxMaturityPeriodYears: 25,
    minEntryAge: 13,
    maxEntryAge: 50,
    features: ['Survival Benefit', 'Maturity Benefit', 'Death Benefit', 'Bonus'],
  },

  // Other Life Insurance Companies
  {
    name: 'HDFC Life Sanchay Plus',
    type: 'Life',
    company: 'HDFC Life',
    description: 'Guaranteed savings and income plan',
    premiumFrequencies: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    minCoverageAmount: 100000,
    maxCoverageAmount: 50000000,
    minMaturityPeriodYears: 10,
    maxMaturityPeriodYears: 30,
    minEntryAge: 0,
    maxEntryAge: 65,
    features: ['Guaranteed Income', 'Life Cover', 'Lump Sum Payout', 'Tax Benefits'],
  },
  {
    name: 'SBI Life Smart Platina Plus',
    type: 'Life',
    company: 'SBI Life',
    description: 'Unit linked insurance plan with market-linked returns',
    premiumFrequencies: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    minCoverageAmount: 200000,
    maxCoverageAmount: 50000000,
    minMaturityPeriodYears: 10,
    maxMaturityPeriodYears: 30,
    minEntryAge: 18,
    maxEntryAge: 65,
    features: ['Market Returns', 'Life Cover', 'Fund Switching', 'Tax Benefits'],
  },
  {
    name: 'ICICI Pru iProtect Smart',
    type: 'Life',
    company: 'ICICI Prudential',
    description: 'Comprehensive term plan with multiple benefits',
    premiumFrequencies: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    minCoverageAmount: 5000000,
    maxCoverageAmount: 100000000,
    minMaturityPeriodYears: 10,
    maxMaturityPeriodYears: 40,
    minEntryAge: 18,
    maxEntryAge: 65,
    features: ['High Coverage', 'Critical Illness', 'Accidental Death', 'Terminal Illness'],
  },

  // Health Insurance
  {
    name: 'Star Health Comprehensive',
    type: 'Health',
    company: 'Star Health',
    description: 'Comprehensive health insurance for individuals and families',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 100000,
    maxCoverageAmount: 10000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 65,
    features: ['Hospitalization', 'Day Care', 'Pre & Post Hospitalization', 'No Claim Bonus'],
  },
  {
    name: 'Star Health Family Health Optima',
    type: 'Health',
    company: 'Star Health',
    description: 'Family floater health insurance plan',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 300000,
    maxCoverageAmount: 25000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 65,
    features: ['Family Floater', 'Automatic Recharge', 'Maternity Cover', 'New Born Cover'],
  },
  {
    name: 'ICICI Lombard Complete Health',
    type: 'Health',
    company: 'ICICI Lombard',
    description: 'Complete health insurance with modern benefits',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 200000,
    maxCoverageAmount: 5000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 65,
    features: ['Cashless Treatment', 'Mental Health Cover', 'Home Healthcare', 'Wellness Benefits'],
  },
  {
    name: 'New India Assurance Health',
    type: 'Health',
    company: 'New India Assurance',
    description: 'Government health insurance scheme',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 100000,
    maxCoverageAmount: 1000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 3,
    maxEntryAge: 65,
    features: ['Government Backed', 'Wide Network', 'Cashless Facility', 'Low Premium'],
  },
  {
    name: 'Niva Bupa Health Companion',
    type: 'Health',
    company: 'Niva Bupa',
    description: 'Individual health insurance with enhanced coverage',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 300000,
    maxCoverageAmount: 10000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 65,
    features: ['Consumables Cover', 'No Sub-Limits', 'Wellness Rewards', 'Global Coverage'],
  },

  // Vehicle Insurance
  {
    name: 'Two-Wheeler Comprehensive',
    type: 'Vehicle',
    company: 'Various',
    description: 'Comprehensive insurance for two-wheelers covering own damage and third party',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 50000,
    maxCoverageAmount: 500000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 99,
    features: ['Own Damage Cover', 'Third Party Liability', 'Personal Accident', 'Theft Cover'],
  },
  {
    name: 'Two-Wheeler Third Party Only',
    type: 'Vehicle',
    company: 'Various',
    description: 'Mandatory third party liability insurance for two-wheelers',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 0,
    maxCoverageAmount: 0,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 99,
    features: ['Third Party Liability', 'Personal Accident Cover', 'Legal Compliance'],
  },
  {
    name: 'Four-Wheeler Comprehensive',
    type: 'Vehicle',
    company: 'Various',
    description: 'Comprehensive insurance for cars covering own damage and third party',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 100000,
    maxCoverageAmount: 10000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 99,
    features: ['Own Damage Cover', 'Third Party Liability', 'Personal Accident', 'Roadside Assistance'],
  },
  {
    name: 'Four-Wheeler Third Party Only',
    type: 'Vehicle',
    company: 'Various',
    description: 'Mandatory third party liability insurance for cars',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 0,
    maxCoverageAmount: 0,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 99,
    features: ['Third Party Liability', 'Personal Accident Cover', 'Legal Compliance'],
  },

  // Property Insurance
  {
    name: 'Home Insurance',
    type: 'Property',
    company: 'Various',
    description: 'Comprehensive home and contents insurance',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 500000,
    maxCoverageAmount: 50000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 99,
    features: ['Structure Cover', 'Contents Cover', 'Fire & Theft', 'Natural Disasters'],
  },
  {
    name: 'Shop/Office Insurance',
    type: 'Property',
    company: 'Various',
    description: 'Commercial property insurance for shops and offices',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 500000,
    maxCoverageAmount: 100000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 18,
    maxEntryAge: 99,
    features: ['Building Cover', 'Contents Cover', 'Business Interruption', 'Fire & Allied Perils'],
  },

  // Travel Insurance
  {
    name: 'Domestic Travel Insurance',
    type: 'Travel',
    company: 'Various',
    description: 'Travel insurance for domestic trips within India',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 100000,
    maxCoverageAmount: 5000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 2,
    maxEntryAge: 70,
    features: ['Trip Cancellation', 'Medical Emergency', 'Baggage Loss', 'Personal Accident'],
  },
  {
    name: 'International Travel Insurance',
    type: 'Travel',
    company: 'Various',
    description: 'Comprehensive travel insurance for international trips',
    premiumFrequencies: ['yearly'],
    minCoverageAmount: 500000,
    maxCoverageAmount: 50000000,
    minMaturityPeriodYears: 1,
    maxMaturityPeriodYears: 1,
    minEntryAge: 2,
    maxEntryAge: 70,
    features: ['Medical Emergency', 'Trip Cancellation', 'Passport Loss', 'Flight Delay'],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Create admin user if not exists
    const existingAdmin = await User.findOne({ email: 'admin@samwininfotech.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Admin',
        email: 'admin@samwininfotech.com',
        password: 'admin123',
        role: 'admin',
        phone: '9999999999',
      });
      console.log('Admin user created (admin@samwininfotech.com / admin123)');
    } else {
      console.log('Admin user already exists');
    }

    // Seed schemes if none exist
    const schemeCount = await Scheme.countDocuments();
    if (schemeCount === 0) {
      await Scheme.insertMany(defaultSchemes);
      console.log(`${defaultSchemes.length} default schemes seeded`);
    } else {
      console.log(`Schemes already exist (${schemeCount} found), skipping seed`);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
