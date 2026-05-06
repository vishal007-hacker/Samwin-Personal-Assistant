const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { mongoUri } = require('../config/env');
const Stock = require('../models/Stock');

// Data from PDF — purchase price = selling price - 500
const mobiles = [
  { uniqueCode: 1, brand: 'Samsung', model: 'Galaxy M30', network: '4G', displayQuality: 'DP', ram: '6', storage: '128', purchasedFrom: 'Deva', color: 'Blue & Black', sellingPrice: 4500 },
  { uniqueCode: 3, brand: 'Samsung', model: 'Galaxy M21', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Blue & Green', sellingPrice: 4500 },
  { uniqueCode: 5, brand: 'Samsung', model: 'Galaxy A21s', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Black', sellingPrice: 4500 },
  { uniqueCode: 6, brand: 'Samsung', model: 'Galaxy A70', network: '4G', displayQuality: 'DP', ram: '6', storage: '128', purchasedFrom: 'Deva', color: 'Panda Sticker', sellingPrice: 5000 },
  { uniqueCode: 7, brand: 'Samsung', model: 'Tab', network: '4G', displayQuality: 'DP', ram: '2', storage: '16', purchasedFrom: 'Deva', color: 'White', sellingPrice: 3000 },
  { uniqueCode: 24, brand: 'Samsung', model: 'A13', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Grey', sellingPrice: 4500 },
  { uniqueCode: 26, brand: 'Lenovo', model: 'Tab', network: '4G', displayQuality: 'DP', ram: '2', storage: '16', purchasedFrom: 'Deva', color: 'Black', sellingPrice: 2000 },
  { uniqueCode: 27, brand: 'Redmi', model: 'Y3', network: '4G', displayQuality: 'DP', ram: '3', storage: '32', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4000 },
  { uniqueCode: 37, brand: 'Vivo', model: 'Y30', network: '4G', displayQuality: 'LED', ram: '4', storage: '128', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4800 },
  { uniqueCode: 40, brand: 'Oppo', model: 'A5', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4000 },
  { uniqueCode: 43, brand: 'Oppo', model: 'A55', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Black', sellingPrice: 4500 },
  { uniqueCode: 44, brand: 'Realme', model: 'Narzo 20', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Gray', sellingPrice: 4000 },
  { uniqueCode: 47, brand: 'Redmi', model: '8', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4500 },
  { uniqueCode: 50, brand: 'Vivo', model: 'S1 Pro', network: '4G', displayQuality: 'DP', ram: '8', storage: '128', purchasedFrom: 'Deva', color: 'Dreamy White', sellingPrice: 5500 },
  { uniqueCode: 53, brand: 'Vivo', model: 'U 20', network: '4G', displayQuality: 'DP', ram: '6', storage: '64', purchasedFrom: 'Deva', color: 'Blue & Violite', sellingPrice: 5000 },
  { uniqueCode: 62, brand: 'Vivo', model: 'Y20', network: '4G', displayQuality: 'DP', ram: '8', storage: '128', purchasedFrom: 'Deva', color: 'Violite', sellingPrice: 5500 },
  { uniqueCode: 65, brand: 'Redmi', model: '9i', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4300 },
  { uniqueCode: 69, brand: 'Redmi', model: 'Note 7S', network: '4G', displayQuality: 'LED', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Black', sellingPrice: 4000 },
  { uniqueCode: 71, brand: 'Redmi', model: 'Note 7S', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Black', sellingPrice: 4000 },
  { uniqueCode: 74, brand: 'Redmi', model: '9', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4000 },
  { uniqueCode: 75, brand: 'Redmi', model: '9i', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4000 },
  { uniqueCode: 78, brand: 'Oppo', model: 'A5s', network: '4G', displayQuality: 'DP', ram: '3', storage: '32', purchasedFrom: 'Deva', color: 'Blue & Violite', sellingPrice: 3000 },
  { uniqueCode: 79, brand: 'Redmi', model: '6 Pro', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Black', sellingPrice: 4000 },
  { uniqueCode: 81, brand: 'Vivo', model: 'Y30', network: '4G', displayQuality: 'DP', ram: '4+1', storage: '128', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4500 },
  { uniqueCode: 82, brand: 'Redmi', model: 'Note 5 Pro', network: '4G', displayQuality: 'LED', ram: '6', storage: '64', purchasedFrom: 'Deva', color: 'Golden', sellingPrice: 4500 },
  { uniqueCode: 83, brand: 'Redmi', model: '9i', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4500 },
  { uniqueCode: 85, brand: 'Moto', model: 'e40', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: '', sellingPrice: 4000 },
  { uniqueCode: 86, brand: 'Vivo', model: 'Y21 G', network: '4G', displayQuality: 'DP', ram: '4+1', storage: '64', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4500 },
  { uniqueCode: 87, brand: 'Redmi', model: 'Note 9', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Black', sellingPrice: 4000 },
  { uniqueCode: 88, brand: 'Samsung', model: 'Galaxy A10', network: '4G', displayQuality: 'DP', ram: '2', storage: '32', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 3000 },
  { uniqueCode: 89, brand: 'Samsung', model: 'Galaxy A30s', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'White', sellingPrice: 4000 },
  { uniqueCode: 90, brand: 'Oppo', model: 'A83 (2018)', network: '4G', displayQuality: 'DP', ram: '2', storage: '16', purchasedFrom: 'Deva', color: 'Golden', sellingPrice: 1500 },
  { uniqueCode: 91, brand: 'Samsung', model: 'Galaxy A12', network: '4G', displayQuality: 'DP', ram: '6', storage: '128', purchasedFrom: 'Deva', color: 'Blue', sellingPrice: 4800 },
  { uniqueCode: 92, brand: 'Samsung', model: 'Galaxy F55', network: '5G', displayQuality: 'DP', ram: '8', storage: '256', purchasedFrom: 'Deva', color: 'Dark Blue', sellingPrice: 7500 },
  { uniqueCode: 93, brand: 'Realme', model: 'C25 Y', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'Gray', sellingPrice: 4200 },
  { uniqueCode: 94, brand: 'Oppo', model: 'A15 S', network: '4G', displayQuality: 'DP', ram: '4', storage: '64', purchasedFrom: 'Deva', color: 'White', sellingPrice: 4700 },
  { uniqueCode: 95, brand: 'Redmi', model: 'Note 9', network: '4G', displayQuality: 'OG', ram: '4+1', storage: '64', purchasedFrom: 'Deva', color: 'Dark Blue', sellingPrice: 0 },
];

async function seed() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Delete all existing mobile stock and sold items
    const deleteResult = await Stock.deleteMany({ category: 'mobile' });
    console.log(`Deleted ${deleteResult.deletedCount} existing mobile stock items`);

    // Reset the counter for stock codes
    const Counter = mongoose.model('Counter');
    const maxCode = Math.max(...mobiles.map(m => m.uniqueCode));
    await Counter.findByIdAndUpdate('stockCode', { seq: maxCode }, { upsert: true });
    console.log(`Counter set to ${maxCode}`);

    // Insert new stock from PDF
    const docs = mobiles.map((m) => ({
      uniqueCode: m.uniqueCode,
      category: 'mobile',
      brand: m.brand,
      model: m.model,
      ram: m.ram + 'GB',
      storage: m.storage + 'GB',
      displayQuality: m.displayQuality,
      color: m.color,
      purchasePrice: m.sellingPrice > 0 ? m.sellingPrice - 500 : 0,
      sellingPrice: m.sellingPrice,
      purchasedFrom: m.purchasedFrom,
      status: 'in_stock',
    }));

    // Use insertMany with ordered:false to skip duplicates
    const result = await Stock.insertMany(docs, { ordered: false });
    console.log(`Inserted ${result.length} mobile stock items`);

    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    if (err.insertedDocs) {
      console.log(`Inserted ${err.insertedDocs.length} items (some may have been skipped due to duplicates)`);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

seed();
