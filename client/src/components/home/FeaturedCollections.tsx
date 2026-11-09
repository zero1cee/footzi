import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const CATEGORIES = [
  {
    name: 'Artisanal Loafers',
    subtitle: 'Penny, Venetian & Tassel silhouettes in glove-soft calfskin',
    category: 'Loafers',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
    count: '6 Silhouettes',
  },
  {
    name: 'Minimal Court Sneakers',
    subtitle: 'Ultra-clean Italian Nappa leather with stitched cupsole',
    category: 'Sneakers',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80',
    count: '4 Silhouettes',
  },
  {
    name: 'Monk Straps & Oxfords',
    subtitle: 'Hand-burnished museum patina and solid brass buckles',
    category: 'Oxfords',
    image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80',
    count: '5 Silhouettes',
  },
  {
    name: 'Sandstone Chelsea Boots',
    subtitle: 'Oiled water-resistant nubuck with shock-absorbing crepe soles',
    category: 'Boots',
    image: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80',
    count: '3 Silhouettes',
  },
];

export const FeaturedCollections: React.FC = () => {
  return (
    <section className="py-16 md:py-24 bg-ivory-100 border-b border-ivory-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-sand-600 font-semibold block mb-1">
              Curated Architecture
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
              Shop by Silhouette
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mt-2 md:mt-0 font-light">
            Form follows function. Each category is engineered around anatomical lasts designed specifically for Indian feet.
          </p>
        </div>

        {/* 4-Column Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              to={`/shop?category=${cat.category}`}
              className="group relative flex flex-col h-96 rounded-xs overflow-hidden border border-ivory-300 bg-charcoal-900 shadow-sm"
            >
              {/* Background Image */}
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover object-center opacity-85 group-hover:scale-105 group-hover:opacity-95 transition-all duration-700 ease-out"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-950/30 to-transparent" />

              {/* Top Badge */}
              <div className="absolute top-4 left-4">
                <span className="text-[10px] uppercase tracking-widest text-ivory-100 bg-charcoal-900/80 backdrop-blur-sm px-2.5 py-1 rounded-xs border border-charcoal-700">
                  {cat.count}
                </span>
              </div>

              {/* Bottom Content */}
              <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end text-ivory-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-medium tracking-wide group-hover:text-sand-300 transition-colors">
                    {cat.name}
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-ivory-100/10 group-hover:bg-sand-400 group-hover:text-charcoal-950 flex items-center justify-center transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-ivory-300/80 mt-1 line-clamp-2 font-light">
                  {cat.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
};
