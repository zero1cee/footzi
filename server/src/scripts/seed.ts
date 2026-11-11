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
  {
    name: 'The Mehtab Wingtip Brogue',
    slug: 'mehtab-wingtip-brogue',
    subtitle: 'Full-Brogue Perforations with Burnished Medallion',
    description:
      'A masterwork in traditional bespoke shoemaking. Hand-punched brogueing along the wingtip and quarter seams, crafted from vegetable-tanned French calfskin with channelled Goodyear welt soles.',
    category: 'Oxfords',
    brand: 'Footzi Atelier',
    price: 4799,
    originalPrice: 7299,
    discountPercent: 34,
    rating: 4.9,
    reviewCount: 53,
    badge: 'Artisan Heritage',
    images: [
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Oxblood Crimson', hex: '#581825', imageIndex: 0 },
      { name: 'English Tan', hex: '#945432', imageIndex: 1 },
    ],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
    material: 'Full-Grain French Calfskin',
    sole: 'Hand-Welted Oak Bark Leather Sole with Brass Nails',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Hand-punched medallion toe perforation',
      'Goodyear welt storm construction',
      'Solid brass peg reinforcements in waist',
      'Full calf lining',
    ],
    variants: [
      { sku: 'FTZ-MHB-OXB-UK7', size: 'UK 7', color: 'Oxblood Crimson', colorHex: '#581825', stock: 6, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-MHB-OXB-UK8', size: 'UK 8', color: 'Oxblood Crimson', colorHex: '#581825', stock: 11, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-MHB-OXB-UK9', size: 'UK 9', color: 'Oxblood Crimson', colorHex: '#581825', stock: 14, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-MHB-OXB-UK10', size: 'UK 10', color: 'Oxblood Crimson', colorHex: '#581825', stock: 3, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Arambagh Belgian Tassel Loafer',
    slug: 'arambagh-belgian-tassel-loafer',
    subtitle: 'Braided Leather Collar with Hand-Knotted Tassels',
    description:
      'Refined ease tailored for garden soirees and boardroom poise. Made with hand-knotted tassels, braided calf piping, and an ultra-supple reversed calf suede that requires zero break-in period.',
    category: 'Loafers',
    brand: 'Footzi Atelier',
    price: 3699,
    originalPrice: 5499,
    discountPercent: 32,
    rating: 4.8,
    reviewCount: 77,
    badge: 'New Arrival',
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Mocha Espresso', hex: '#3B2219', imageIndex: 0 },
      { name: 'Olive Suede', hex: '#4B4D3A', imageIndex: 1 },
    ],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Reversed Italian Calf Suede',
    sole: 'Light Flex-Welt Leather with Rubber Island',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Twin hand-rolled leather tassels',
      'Braided apron welt detailing',
      'Featherweight structural arch shank',
      'Micro-cushion padded insole',
    ],
    variants: [
      { sku: 'FTZ-ABG-MOC-UK7', size: 'UK 7', color: 'Mocha Espresso', colorHex: '#3B2219', stock: 8, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-ABG-MOC-UK8', size: 'UK 8', color: 'Mocha Espresso', colorHex: '#3B2219', stock: 12, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-ABG-MOC-UK9', size: 'UK 9', color: 'Mocha Espresso', colorHex: '#3B2219', stock: 15, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-ABG-MOC-UK10', size: 'UK 10', color: 'Mocha Espresso', colorHex: '#3B2219', stock: 5, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Yamuna Suede Mule Slip-on',
    slug: 'yamuna-suede-mule-slip-on',
    subtitle: 'Backless Architectural Profile with Contoured Footbed',
    description:
      'Contemporary minimalism at its finest. Slip in and out effortlessly with the Yamuna Mule, featuring architectural bevelled edges, water-repellent suede upper, and an orthopedic cork-latex footbed.',
    category: 'Slip-ons',
    brand: 'Footzi Studio',
    price: 2499,
    originalPrice: 3799,
    discountPercent: 34,
    rating: 4.7,
    reviewCount: 61,
    badge: 'New Arrival',
    images: [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Sand Beige', hex: '#D8C7B0', imageIndex: 0 },
      { name: 'Anthracite', hex: '#262626', imageIndex: 1 },
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
    material: 'Hydrophobic Split Calf Suede',
    sole: 'EVA Wave Traction Outsole',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Deep ergonomic heel cup aligns walking posture',
      'Raised toe-bar assists natural gripping motion',
      'Water and dirt repellent Scotchgard suede shield',
      'Featherweight 220-gram profile',
    ],
    variants: [
      { sku: 'FTZ-YMN-SND-UK7', size: 'UK 7', color: 'Sand Beige', colorHex: '#D8C7B0', stock: 10, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-YMN-SND-UK8', size: 'UK 8', color: 'Sand Beige', colorHex: '#D8C7B0', stock: 14, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-YMN-SND-UK9', size: 'UK 9', color: 'Sand Beige', colorHex: '#D8C7B0', stock: 9, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Itimad Jodhpur Ankle Boot',
    slug: 'itimad-jodhpur-ankle-boot',
    subtitle: 'Cross-Strap Wrap Closure with Antique Brass Hardware',
    description:
      'Equestrian poise rooted in North Indian heritage. Seamless one-piece vamp with wraparound bridle strap and roller buckle, crafted from waxy pull-up leather that distresses handsomely with age.',
    category: 'Boots',
    brand: 'Footzi Atelier',
    price: 5299,
    originalPrice: 7999,
    discountPercent: 33,
    rating: 4.9,
    reviewCount: 44,
    badge: 'Limited Run',
    images: [
      'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Havana Tan', hex: '#7A482A', imageIndex: 0 },
      { name: 'Raven Black', hex: '#111111', imageIndex: 1 },
    ],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
    material: 'Oiled Pull-Up Cowhide',
    sole: 'Dainite-Style Studded Rubber Sole',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'One-piece seamless vamp construction',
      'Solid brass roller buckle and Chicago screw fittings',
      'Dainite-pattern grip sole for monsoon traction',
      'Antibacterial leather-covered Poron insole',
    ],
    variants: [
      { sku: 'FTZ-ITM-HAV-UK7', size: 'UK 7', color: 'Havana Tan', colorHex: '#7A482A', stock: 4, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-ITM-HAV-UK8', size: 'UK 8', color: 'Havana Tan', colorHex: '#7A482A', stock: 8, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-ITM-HAV-UK9', size: 'UK 9', color: 'Havana Tan', colorHex: '#7A482A', stock: 10, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-ITM-HAV-UK10', size: 'UK 10', color: 'Havana Tan', colorHex: '#7A482A', stock: 2, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Charbagh Knit Trainer',
    slug: 'charbagh-knit-trainer',
    subtitle: 'Zero-Waste 3D Knit Upper with Rebound Sole',
    description:
      'Where ancient symmetry meets modern athletic engineering. Featuring an engineered 3D jacquard knit upper inspired by Mughal four-fold garden symmetry, with an ultra-responsive supercritical nitrogen EVA sole.',
    category: 'Sneakers',
    brand: 'Footzi Performance',
    price: 2999,
    originalPrice: 4499,
    discountPercent: 33,
    rating: 4.8,
    reviewCount: 110,
    badge: 'Best Seller',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Onyx Mineral', hex: '#222224', imageIndex: 0 },
      { name: 'Ivory Dune', hex: '#EDE6DA', imageIndex: 1 },
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Engineered High-Tensile Recycled Knit Yarn',
    sole: 'Supercritical Nitrogen-Infused Rebound Phylon',
    craftsmanshipLocation: 'Assembled in Agra & Greater Noida',
    features: [
      'Zone-engineered elasticity moves with foot articulation',
      'Supercritical midsole returns 68% kinetic energy',
      'Grip-pod rubber outsole prevents wet surface slippage',
      'Machine washable cold cycle compatible',
    ],
    variants: [
      { sku: 'FTZ-CBG-ONX-UK7', size: 'UK 7', color: 'Onyx Mineral', colorHex: '#222224', stock: 12, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-CBG-ONX-UK8', size: 'UK 8', color: 'Onyx Mineral', colorHex: '#222224', stock: 16, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-CBG-ONX-UK9', size: 'UK 9', color: 'Onyx Mineral', colorHex: '#222224', stock: 20, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Khas Single Monk Venetian',
    slug: 'khas-single-monk-venetian',
    subtitle: 'Bevelled Chisel Last with Hidden Elastic Gusset',
    description:
      'Uncompromising elegance for formal galas and high-stakes executive summits. Features a streamlined single monk strap with hidden elastic stretch for slip-on ease, hand-lasted from Grade-1 full grain calfskin.',
    category: 'Oxfords',
    brand: 'Footzi Atelier',
    price: 4699,
    originalPrice: 6999,
    discountPercent: 32,
    rating: 4.9,
    reviewCount: 38,
    badge: 'Artisan Heritage',
    images: [
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1000&q=80',
    ],
    colors: [
      { name: 'Midnight Charcoal', hex: '#1C1C1E', imageIndex: 0 },
      { name: 'Walnut Brown', hex: '#452A18', imageIndex: 1 },
    ],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
    material: 'Full-Grain Boxcalf Crust Leather',
    sole: 'Hand-buffed Argentine Leather Sole with Rubber Inlay',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Hand-buffed museum grade finish',
      'Concealed elastic under strap allows effortless slip-on',
      'Fiddleback bevelled waist for sculptural beauty',
      'Breathable sheepskin sockliner',
    ],
    variants: [
      { sku: 'FTZ-KHS-MID-UK7', size: 'UK 7', color: 'Midnight Charcoal', colorHex: '#1C1C1E', stock: 5, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-KHS-MID-UK8', size: 'UK 8', color: 'Midnight Charcoal', colorHex: '#1C1C1E', stock: 9, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-KHS-MID-UK9', size: 'UK 9', color: 'Midnight Charcoal', colorHex: '#1C1C1E', stock: 12, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-KHS-MID-UK10', size: 'UK 10', color: 'Midnight Charcoal', colorHex: '#1C1C1E', stock: 4, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Agra Pace Retro Suede Runner',
    slug: 'pace-retro-suede-runner',
    subtitle: 'Heritage Sand Suede & Technical Nylon with Forest Green Wedge',
    description:
      'Inspired by vintage marathon silhouettes and the artisan craftsmanship of Agra. Crafted with premium brushed suede overlays, breathable ripstop nylon quarters, iconic serrated tri-stripes, and an ultra-cushioned dual-density EVA wedge sole.',
    category: 'Sneakers',
    brand: 'Footzi Originals',
    price: 1999,
    originalPrice: 3499,
    discountPercent: 43,
    rating: 4.8,
    reviewCount: 64,
    badge: 'New Arrival',
    images: ['/images/products/sneaker-retro-runner-tan.jpg'],
    colors: [{ name: 'Sand & Forest Green', hex: '#C2A37E', imageIndex: 0 }],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Brushed Split Suede & High-Tensile Ripstop Nylon',
    sole: 'Dual-Density EVA Midsole with Heritage Grippy Gum Lug Outsole',
    craftsmanshipLocation: 'Crafted in Agra, Uttar Pradesh',
    features: [
      'Plush brushed suede overlays for vintage structure and durability',
      'Dual-density EVA foam midsole with contrast forest green wedge',
      'High-traction rubber tread designed for everyday city stride',
      'Breathable mesh sockliner with anatomical arch cushioning',
    ],
    variants: [
      { sku: 'FTZ-PCR-SND-UK6', size: 'UK 6', color: 'Sand & Forest Green', colorHex: '#C2A37E', stock: 8, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-PCR-SND-UK7', size: 'UK 7', color: 'Sand & Forest Green', colorHex: '#C2A37E', stock: 14, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-PCR-SND-UK8', size: 'UK 8', color: 'Sand & Forest Green', colorHex: '#C2A37E', stock: 18, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-PCR-SND-UK9', size: 'UK 9', color: 'Sand & Forest Green', colorHex: '#C2A37E', stock: 15, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-PCR-SND-UK10', size: 'UK 10', color: 'Sand & Forest Green', colorHex: '#C2A37E', stock: 10, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-PCR-SND-UK11', size: 'UK 11', color: 'Sand & Forest Green', colorHex: '#C2A37E', stock: 6, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Grand Court Street Minimalist Sneaker',
    slug: 'grand-court-street-minimalist-sneaker',
    subtitle: 'Action Leather Low-Top with Slate Grey 3-Stripes',
    description:
      'A court classic engineered for clean daily styling. Crafted with crisp action leather, perforated toe-box ventilation, signature slate grey stripes, and a durable non-marking rubber cupsole.',
    category: 'Sneakers',
    brand: 'Footzi Originals',
    price: 1999,
    originalPrice: 3299,
    discountPercent: 39,
    rating: 4.9,
    reviewCount: 82,
    badge: 'Best Seller',
    images: ['/images/products/sneaker-court-classic-white.jpg'],
    colors: [{ name: 'Cloud White & Slate Grey', hex: '#EBEBEB', imageIndex: 0 }],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Action Leather Upper with Perforated Micro-Vent Toe',
    sole: 'Low-Profile Stitched Rubber Cupsole with Agility Pivot Points',
    craftsmanshipLocation: 'Crafted in Agra, Uttar Pradesh',
    features: [
      'Crisp white action leather that resists scuffs and cleans effortlessly',
      'Micro-perforated toe box for optimal tropical climate breathability',
      'Cushioned ankle collar and padded tongue for zero break-in period',
      'Full perimeter stitched cupsole ensuring extended longevity',
    ],
    variants: [
      { sku: 'FTZ-GCS-WHT-UK6', size: 'UK 6', color: 'Cloud White & Slate Grey', colorHex: '#EBEBEB', stock: 10, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-GCS-WHT-UK7', size: 'UK 7', color: 'Cloud White & Slate Grey', colorHex: '#EBEBEB', stock: 16, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-GCS-WHT-UK8', size: 'UK 8', color: 'Cloud White & Slate Grey', colorHex: '#EBEBEB', stock: 22, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-GCS-WHT-UK9', size: 'UK 9', color: 'Cloud White & Slate Grey', colorHex: '#EBEBEB', stock: 19, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-GCS-WHT-UK10', size: 'UK 10', color: 'Cloud White & Slate Grey', colorHex: '#EBEBEB', stock: 12, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-GCS-WHT-UK11', size: 'UK 11', color: 'Cloud White & Slate Grey', colorHex: '#EBEBEB', stock: 8, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Terrace Heritage Gum Sneaker',
    slug: 'terrace-heritage-gum-sneaker',
    subtitle: 'Chalk White Grain Leather & T-Toe Suede with Honey Gum Sole',
    description:
      'Rooted in football terrace culture and Agra leather legacy. Clean chalk-white leather upper crowned with an authentic suede T-toe cap, emerald green signature stripes, and a vulcanized honey gum rubber outsole.',
    category: 'Sneakers',
    brand: 'Footzi Originals',
    price: 1999,
    originalPrice: 3699,
    discountPercent: 46,
    rating: 4.9,
    reviewCount: 95,
    badge: 'Artisan Heritage',
    images: ['/images/products/sneaker-terrace-gum-white-green.jpg'],
    colors: [{ name: 'Chalk White & Forest Green', hex: '#1C5C36', imageIndex: 0 }],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Supple Chalk Grain Leather with Suede T-Toe Inset',
    sole: 'Vulcanized Natural Honey Gum Rubber Cupsole',
    craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
    features: [
      'Classic terrace silhouette with reinforced suede T-toe bumper',
      'Rich emerald leather serrated side stripes',
      'Honey gum translucent cupsole with vintage herringbone pattern',
      'Molded EVA footbed wrapped in sweat-wicking textile',
    ],
    variants: [
      { sku: 'FTZ-THG-GRN-UK6', size: 'UK 6', color: 'Chalk White & Forest Green', colorHex: '#1C5C36', stock: 8, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-THG-GRN-UK7', size: 'UK 7', color: 'Chalk White & Forest Green', colorHex: '#1C5C36', stock: 12, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-THG-GRN-UK8', size: 'UK 8', color: 'Chalk White & Forest Green', colorHex: '#1C5C36', stock: 18, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-THG-GRN-UK9', size: 'UK 9', color: 'Chalk White & Forest Green', colorHex: '#1C5C36', stock: 16, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-THG-GRN-UK10', size: 'UK 10', color: 'Chalk White & Forest Green', colorHex: '#1C5C36', stock: 9, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-THG-GRN-UK11', size: 'UK 11', color: 'Chalk White & Forest Green', colorHex: '#1C5C36', stock: 5, supplierRef: 'SUP-AGR-01' },
    ],
    reviews: [],
  },
  {
    name: 'The Corduroy & Suede Terrace Sneaker',
    slug: 'corduroy-suede-terrace-sneaker',
    subtitle: 'Textured Olive Corduroy, Velvety Suede & Amber Translucent Gum',
    description:
      'A rich textural twist on the classic terrace trainer. Combines tactile olive drab wide-wale corduroy with plush moss suede overlays, deep espresso stripes, and a semi-translucent amber gum cupsole.',
    category: 'Sneakers',
    brand: 'Footzi Originals',
    price: 1999,
    originalPrice: 3599,
    discountPercent: 44,
    rating: 4.8,
    reviewCount: 53,
    badge: 'Limited Run',
    images: ['/images/products/sneaker-corduroy-terrace-olive.jpg'],
    colors: [{ name: 'Olive Corduroy & Amber Gum', hex: '#585D3B', imageIndex: 0 }],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    material: 'Textured Wide-Wale Corduroy & Supple Split Suede',
    sole: 'Semi-Translucent Amber Gum Rubber with Radial Pivot Pattern',
    craftsmanshipLocation: 'Crafted in Agra, Uttar Pradesh',
    features: [
      'Tactile olive corduroy quarter panels paired with soft suede mudguards',
      'Semi-translucent wrap-around amber gum sole with internal cushioning',
      'Espresso brown synthetic leather stripes and heel tab',
      'Footbed lined with breathable cotton twill for barefoot comfort',
    ],
    variants: [
      { sku: 'FTZ-CST-OLV-UK6', size: 'UK 6', color: 'Olive Corduroy & Amber Gum', colorHex: '#585D3B', stock: 6, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-CST-OLV-UK7', size: 'UK 7', color: 'Olive Corduroy & Amber Gum', colorHex: '#585D3B', stock: 10, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-CST-OLV-UK8', size: 'UK 8', color: 'Olive Corduroy & Amber Gum', colorHex: '#585D3B', stock: 15, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-CST-OLV-UK9', size: 'UK 9', color: 'Olive Corduroy & Amber Gum', colorHex: '#585D3B', stock: 14, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-CST-OLV-UK10', size: 'UK 10', color: 'Olive Corduroy & Amber Gum', colorHex: '#585D3B', stock: 8, supplierRef: 'SUP-AGR-01' },
      { sku: 'FTZ-CST-OLV-UK11', size: 'UK 11', color: 'Olive Corduroy & Amber Gum', colorHex: '#585D3B', stock: 4, supplierRef: 'SUP-AGR-01' },
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
  // The demo password is public (README, 1-click login). Set SEED_ADMIN_PASSWORD on a
  // real deployment to give the admin account a private password instead.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminPasswordHash = adminPassword ? await bcrypt.hash(adminPassword, salt) : passwordHash;

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
      passwordHash: adminPasswordHash,
      role: 'admin',
      phone: '+91 98111 22334',
      addresses: [],
    },
  ]);
  console.log(
    adminPassword
      ? '[Seed] Accounts created: patron@footzi.in (Password: Footzi@2026) & admin@footzi.in (password from SEED_ADMIN_PASSWORD)'
      : '[Seed] Demo accounts created: patron@footzi.in & admin@footzi.in (Password: Footzi@2026)'
  );

  await mongoose.connection.close();
  console.log('[Seed Complete] All databases initialized successfully.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
