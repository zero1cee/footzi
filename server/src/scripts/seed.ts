import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Inventory } from '../models/Inventory.js';
import { connectDB } from '../config/db.js';
import bcrypt from 'bcryptjs';

const ALL_PRODUCTS = [
  {
    name: 'The Agra Belgravia Penny Loafer',
    slug: 'agra-belgravia-penny-loafer',
    subtitle: 'Full-Grain Burnished Calfskin with Blake Stitching',
    description:
      'Inspired by the symmetry of Mughal archways, the Belgravia Penny Loafer is handcrafted by master artisans in Agra. Crafted from hand-burnished vegetable-tanned leather with a memory foam footbed and natural leather outsole.',
    category: 'Loafers',
    brand: 'Footzi Atelier',
    price: 3899,
    originalPrice: 5999,
    discountPercent: 35,
    rating: 4.9,
    reviewCount: 142,
    badge: 'Artisan Heritage',
    images: [
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Vintage Tan', hex: '#8C4E28', imageIndex: 0 },
      { name: 'Imperial Onyx', hex: '#1C1C1C', imageIndex: 1 },
      { name: 'Chestnut Brown', hex: '#4A2810', imageIndex: 2 },
    ],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
    material: '100% Genuine Full-Grain Vegetable Tanned Leather',
    sole: 'Argentine Leather with Non-Slip Rubber Inset',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Hand-cut and burnished by Agra generational leather artisans',
      'Flexible Blake-stitch welt construction for durability',
      'Ergonomic triple-density arch support for all-day wear',
      'Breathable sheepskin inner lining',
    ],
    variants: [
      { sku: 'FTZ-BLG-TAN-UK7', size: 'UK 7', color: 'Vintage Tan', colorHex: '#8C4E28', stock: 8, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-BLG-TAN-UK8', size: 'UK 8', color: 'Vintage Tan', colorHex: '#8C4E28', stock: 12, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-BLG-TAN-UK9', size: 'UK 9', color: 'Vintage Tan', colorHex: '#8C4E28', stock: 15, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-BLG-TAN-UK10', size: 'UK 10', color: 'Vintage Tan', colorHex: '#8C4E28', stock: 5, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-BLG-BLK-UK7', size: 'UK 7', color: 'Imperial Onyx', colorHex: '#1C1C1C', stock: 6, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-BLG-BLK-UK8', size: 'UK 8', color: 'Imperial Onyx', colorHex: '#1C1C1C', stock: 10, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-BLG-BLK-UK9', size: 'UK 9', color: 'Imperial Onyx', colorHex: '#1C1C1C', stock: 9, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-BLG-BLK-UK10', size: 'UK 10', color: 'Imperial Onyx', colorHex: '#1C1C1C', stock: 4, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [
      {
        author: 'Vikramaditya S.',
        city: 'Bengaluru',
        rating: 5,
        title: 'Surpassed European Luxury Loafers',
        comment: 'The Belgravia Penny Loafer in Vintage Tan is genuinely magnificent. The burnished patina and leather sole look like an 18,000 INR Italian pair, yet cost a fraction.',
        date: '14 Oct 2026',
        verified: true,
        sizePurchased: 'UK 8',
      },
    ],
  },
  {
    name: 'The Monolith Minimalist Court Sneaker',
    slug: 'monolith-minimalist-court-sneaker',
    subtitle: 'Nappa Leather with Margom-Style Cupsole',
    description:
      'A study in restraint and architectural proportion. Clean silhouettes, Italian Nappa leather uppers, and ultra-durable stitched cupsole. Designed to transition effortlessly from boardrooms to weekend getaways.',
    category: 'Sneakers',
    brand: 'Footzi Studio',
    price: 3299,
    originalPrice: 4999,
    discountPercent: 34,
    rating: 4.8,
    reviewCount: 98,
    badge: 'Best Seller',
    images: [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Warm Chalk', hex: '#FAF7F0', imageIndex: 0 },
      { name: 'Shadow Black', hex: '#1A1A1A', imageIndex: 1 },
      { name: 'Alabaster Dune', hex: '#DED5C4', imageIndex: 2 },
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Full-Grain Butter-Soft Italian Nappa Leather',
    sole: 'Lightweight Stitched Rubber Cupsole with Agility Tread',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Featherlight dual-density EVA + memory foam insole',
      'Padded collar and tongue for friction-free movement',
      'Stitched 360-degree outsole construction',
      'Clean unbranded minimalist upper',
    ],
    variants: [
      { sku: 'FTZ-MNL-WHT-UK7', size: 'UK 7', color: 'Warm Chalk', colorHex: '#FAF7F0', stock: 14, supplierRef: 'SUP-AGR-02' },
      { sku: 'FTZ-MNL-WHT-UK8', size: 'UK 8', color: 'Warm Chalk', colorHex: '#FAF7F0', stock: 18, supplierRef: 'SUP-AGR-02' },
      { sku: 'FTZ-MNL-WHT-UK9', size: 'UK 9', color: 'Warm Chalk', colorHex: '#FAF7F0', stock: 22, supplierRef: 'SUP-AGR-02' },
      { sku: 'FTZ-MNL-WHT-UK10', size: 'UK 10', color: 'Warm Chalk', colorHex: '#FAF7F0', stock: 11, supplierRef: 'SUP-AGR-02' },
      { sku: 'FTZ-MNL-BLK-UK8', size: 'UK 8', color: 'Shadow Black', colorHex: '#1A1A1A', stock: 10, supplierRef: 'SUP-AGR-02' },
      { sku: 'FTZ-MNL-BLK-UK9', size: 'UK 9', color: 'Shadow Black', colorHex: '#1A1A1A', stock: 12, supplierRef: 'SUP-AGR-02' },
    ],
    reviews: [
      {
        author: 'Ananya Mehra',
        city: 'New Delhi',
        rating: 5,
        title: 'The Monolith Sneaker is Flawless',
        comment: 'The butter-soft Italian nappa leather is sublime. Clean silhouette with zero tacky logos.',
        date: '20 Oct 2026',
        verified: true,
        sizePurchased: 'UK 7',
      },
    ],
  },
  {
    name: 'The Taj Double Monk Strap Oxford',
    slug: 'taj-double-monk-strap-oxford',
    subtitle: 'Hand-Antiqued Boxcalf with Solid Brass Buckles',
    description:
      'Bearing the crisp geometric angles of Agra fort colonnades, the Taj Double Monk features hand-finished patina, chisel toe profile, and solid brushed-brass hardware that ages with dignity.',
    category: 'Oxfords',
    brand: 'Footzi Atelier',
    price: 4499,
    originalPrice: 6999,
    discountPercent: 36,
    rating: 5.0,
    reviewCount: 64,
    badge: 'Artisan Heritage',
    images: [
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Cognac Amber', hex: '#8C3D15', imageIndex: 0 },
      { name: 'Midnight Espresso', hex: '#261911', imageIndex: 1 },
    ],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Hand-Selected Boxcalf Crust Leather',
    sole: 'Hand-buffed Oak Bark Tanned Sole with Rubber Tap',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Hand-painted multi-tone museum patina',
      'Custom solid brass roller buckles',
      'Goodyear welt-grade lockstitch edge',
      'Orthotic molded cork footbed filling',
    ],
    variants: [
      { sku: 'FTZ-TDM-COG-UK7', size: 'UK 7', color: 'Cognac Amber', colorHex: '#8C3D15', stock: 7, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-TDM-COG-UK8', size: 'UK 8', color: 'Cognac Amber', colorHex: '#8C3D15', stock: 9, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-TDM-COG-UK9', size: 'UK 9', color: 'Cognac Amber', colorHex: '#8C3D15', stock: 12, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-TDM-COG-UK10', size: 'UK 10', color: 'Cognac Amber', colorHex: '#8C3D15', stock: 4, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [
      {
        author: 'Rohan Deshmukh',
        city: 'Mumbai',
        rating: 5,
        title: 'Agra Leather Craftsmanship at its Finest',
        comment: 'Bought the Taj Double Monk in Cognac Amber. The solid brass hardware and chiselled toe profile turn heads in boardroom meetings.',
        date: '24 Oct 2026',
        verified: true,
        sizePurchased: 'UK 8',
      },
    ],
  },
  {
    name: 'The Aerodrome Runner V1',
    slug: 'aerodrome-runner-v1',
    subtitle: 'Breathable Knit and Structured Suede Overlays',
    description:
      'Engineered for high-mileage urban daily commutes across Indian metros. Features a responsive rebound midsole, heel stabilizer clip, and perforated suede panels.',
    category: 'Sneakers',
    brand: 'Footzi Performance',
    price: 2799,
    originalPrice: 3999,
    discountPercent: 30,
    rating: 4.7,
    reviewCount: 189,
    badge: 'New Arrival',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Crimson Ember', hex: '#C0392B', imageIndex: 0 },
      { name: 'Oatmeal Taupe', hex: '#C7B9A5', imageIndex: 1 },
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
    material: 'Technical Engineered Knit & Split Suede',
    sole: 'High-Rebound Phylon with Continental Grip Rubber',
    craftsmanshipLocation: 'Hand-Assembled in Agra & Delhi NCR',
    features: [
      'Shock-absorbing honeycomb heel cushion',
      'Reinforced thermoplastic TPU eyelet saddle',
      'Ultra-breathable micro-ventilation mesh',
    ],
    variants: [
      { sku: 'FTZ-AER-RED-UK7', size: 'UK 7', color: 'Crimson Ember', colorHex: '#C0392B', stock: 10, supplierRef: 'SUP-AGR-03' },
      { sku: 'FTZ-AER-RED-UK8', size: 'UK 8', color: 'Crimson Ember', colorHex: '#C0392B', stock: 15, supplierRef: 'SUP-AGR-03' },
      { sku: 'FTZ-AER-RED-UK9', size: 'UK 9', color: 'Crimson Ember', colorHex: '#C0392B', stock: 18, supplierRef: 'SUP-AGR-03' },
      { sku: 'FTZ-AER-RED-UK10', size: 'UK 10', color: 'Crimson Ember', colorHex: '#C0392B', stock: 8, supplierRef: 'SUP-AGR-03' },
    ],
    reviews: [],
  },
  {
    name: 'The Fatehpur Chelsea Boot',
    slug: 'fatehpur-chelsea-boot',
    subtitle: 'Water-Resistant Oiled Nubuck with Crepe Sole',
    description:
      'Rugged elegance named after the historic sandstone citadel. Made from supple oiled water-resistant nubuck leather, with heavy-duty stretch gussets and natural plantation crepe rubber soles.',
    category: 'Boots',
    brand: 'Footzi Atelier',
    price: 4999,
    originalPrice: 7499,
    discountPercent: 33,
    rating: 4.9,
    reviewCount: 82,
    badge: 'Limited Run',
    images: [
      'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Desert Camel', hex: '#A37C4C', imageIndex: 0 },
      { name: 'Charcoal Slate', hex: '#2B2B2B', imageIndex: 1 },
    ],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Oiled Sandstone Nubuck',
    sole: 'Natural Honey Plantation Crepe Sole',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Weather-shield oiled leather repels water & dust',
      'Woven double pull-tabs for easy on-and-off',
      'Natural crepe sole provides pillowy shock-absorption',
    ],
    variants: [
      { sku: 'FTZ-FTB-CAM-UK7', size: 'UK 7', color: 'Desert Camel', colorHex: '#A37C4C', stock: 5, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-FTB-CAM-UK8', size: 'UK 8', color: 'Desert Camel', colorHex: '#A37C4C', stock: 11, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-FTB-CAM-UK9', size: 'UK 9', color: 'Desert Camel', colorHex: '#A37C4C', stock: 14, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-FTB-CAM-UK10', size: 'UK 10', color: 'Desert Camel', colorHex: '#A37C4C', stock: 6, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Sikandra Venetian Driving Loafer',
    slug: 'sikandra-venetian-driving-loafer',
    subtitle: 'Silky Suede with Segmented Pebble Rubber Sole',
    description:
      'The quintessential relaxed luxury shoe. Unstructured Italian calf suede that molds like a second skin to your foot, with precision hand-sewn apron stitching and split pebble rubber pods.',
    category: 'Loafers',
    brand: 'Footzi Atelier',
    price: 3499,
    originalPrice: 5199,
    discountPercent: 32,
    rating: 4.8,
    reviewCount: 115,
    badge: 'Best Seller',
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Tobacco Brown', hex: '#653C1F', imageIndex: 0 },
      { name: 'French Navy', hex: '#1C2942', imageIndex: 1 },
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
    material: 'Velvety Italian Split Calf Suede',
    sole: 'Segmented Non-Slip Driving Pebble Sole',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Moccasin tubular glove construction',
      'Heel-wrapping driver pods protect leather while driving',
    ],
    variants: [
      { sku: 'FTZ-SKN-TOB-UK7', size: 'UK 7', color: 'Tobacco Brown', colorHex: '#653C1F', stock: 9, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-SKN-TOB-UK8', size: 'UK 8', color: 'Tobacco Brown', colorHex: '#653C1F', stock: 16, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-SKN-TOB-UK9', size: 'UK 9', color: 'Tobacco Brown', colorHex: '#653C1F', stock: 12, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-SKN-TOB-UK10', size: 'UK 10', color: 'Tobacco Brown', colorHex: '#653C1F', stock: 7, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
];

const seed = async () => {
  await connectDB();

  console.log('[Seed] Clearing existing footwear and inventory...');
  await Product.deleteMany({});
  await Inventory.deleteMany({});
  await User.deleteMany({});

  console.log('[Seed] Seeding Footzi products...');
  const insertedProducts = await Product.insertMany(ALL_PRODUCTS);

  console.log(`[Seed] Seeded ${insertedProducts.length} silhouettes into MongoDB.`);

  // Seed inventory records for every variant
  console.log('[Seed] Initializing size-level inventory records...');
  const inventoryItems = [];
  for (const prod of insertedProducts) {
    for (const v of prod.variants) {
      inventoryItems.push({
        variantSku: v.sku,
        product: prod._id,
        size: v.size,
        color: v.color,
        availableStock: v.stock,
        reservedStock: 0,
        reorderThreshold: 5,
        supplierRef: v.supplierRef || 'SUP-AGR-01',
      });
    }
  }
  await Inventory.insertMany(inventoryItems);
  console.log(`[Seed] Initialized ${inventoryItems.length} inventory variant records.`);

  // Seed Default Admin and Patron Demo Accounts
  console.log('[Seed] Seeding default Demo Accounts...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Footzi@2026', salt);

  await User.create([
    {
      name: 'Arjun Kapoor',
      email: 'patron@footzi.in',
      passwordHash,
      role: 'customer',
      phone: '+91 98765 43210',
      addresses: [
        {
          name: 'Arjun Kapoor',
          phone: '+91 98765 43210',
          addressLine: '42 Heritage Enclave, Civil Lines',
          city: 'Agra',
          state: 'Uttar Pradesh',
          pincode: '282001',
          isDefault: true,
        },
      ],
    },
    {
      name: 'Devraj Chauhan',
      email: 'admin@footzi.in',
      passwordHash,
      role: 'admin',
      phone: '+91 98111 22334',
      addresses: [],
    },
  ]);
  console.log('[Seed] Demo accounts created: patron@footzi.in & admin@footzi.in (Password: Footzi@2026)');

  await mongoose.connection.close();
  console.log('[Seed Complete] All databases initialized successfully.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
