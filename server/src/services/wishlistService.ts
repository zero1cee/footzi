import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';

const MAX_WISHLIST = 100;

const toIds = (list: mongoose.Types.ObjectId[]): string[] => list.map((id) => id.toString());

/** Only ids of styles that exist and are on sale can be hearted; anything else is silently dropped. */
const validProductIds = async (candidates: unknown[]): Promise<mongoose.Types.ObjectId[]> => {
  const ids = [...new Set(candidates.filter((c): c is string => typeof c === 'string' && mongoose.isValidObjectId(c)))].slice(0, MAX_WISHLIST);
  if (ids.length === 0) return [];
  const found = await Product.find({ _id: { $in: ids }, isActive: true }).select('_id').lean();
  return found.map((p) => p._id as mongoose.Types.ObjectId);
};

export class WishlistService {
  async get(userId: string): Promise<string[]> {
    const user = await User.findById(userId).select('wishlist').lean();
    return toIds((user?.wishlist ?? []) as mongoose.Types.ObjectId[]);
  }

  /** Adds one style. Safe to repeat: a style appears once however many times it is added. */
  async add(userId: string, productId: string): Promise<string[]> {
    const [valid] = await validProductIds([productId]);
    if (!valid) throw new Error('This style is not available.');

    // Cap the list with a conditional update, so two racing requests cannot push it past the limit
    await User.updateOne(
      { _id: userId, wishlist: { $ne: valid }, [`wishlist.${MAX_WISHLIST - 1}`]: { $exists: false } },
      { $addToSet: { wishlist: valid } }
    );
    return this.get(userId);
  }

  async remove(userId: string, productId: string): Promise<string[]> {
    if (mongoose.isValidObjectId(productId)) {
      await User.updateOne({ _id: userId }, { $pull: { wishlist: new mongoose.Types.ObjectId(productId) } });
    }
    return this.get(userId);
  }

  /** Folds a guest's hearts into the account's list (a union), so signing in never loses either side. */
  async merge(userId: string, productIds: unknown[]): Promise<string[]> {
    const valid = await validProductIds(productIds);
    const current = await this.get(userId);
    const room = Math.max(0, MAX_WISHLIST - current.length);
    const fresh = valid.filter((id) => !current.includes(id.toString())).slice(0, room);
    if (fresh.length > 0) await User.updateOne({ _id: userId }, { $addToSet: { wishlist: { $each: fresh } } });
    return this.get(userId);
  }
}

export const wishlistService = new WishlistService();
