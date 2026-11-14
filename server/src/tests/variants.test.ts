import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const IMG = 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4';

describe('Product variants: colours, sizes and their opening stock', () => {
  let adminToken = '';
  const productIds: string[] = [];
  const skuPrefix = `FTZ-VR-${stamp}`;

  const base = (name: string, over: Record<string, unknown> = {}) => ({
    name: `Variant Test ${name} ${stamp}`,
    category: 'Loafers',
    description: 'A test style used by the variant suite',
    price: 3000,
    originalPrice: 3500,
    images: [IMG, `${IMG}?second`],
    ...over,
  });
  const v = (code: string, color: string, size: string, stock = 5, hex = '#8C4E28') => ({ sku: `${skuPrefix}-${code}`, color, size, colorHex: hex, stock });
  const create = (body: any) => request(app).post('/api/admin/products').set(auth(adminToken)).send(body);
  const edit = (id: string, body: any) => request(app).put(`/api/admin/products/${id}`).set(auth(adminToken)).send(body);
  const made = async (body: any) => {
    const res = await create(body);
    expect(res.status).toBe(201);
    productIds.push(res.body.product._id);
    return res.body.product;
  };
  const stockOf = async (sku: string) => {
    const inv = await Inventory.findOne({ variantSku: sku }).lean();
    return inv ? { available: inv.availableStock, reserved: inv.reservedStock } : null;
  };

  beforeAll(async () => {
    await connectDB();
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' })).body.token;
  });

  afterAll(async () => {
    await Inventory.deleteMany({ variantSku: new RegExp(`^${skuPrefix}`) });
    await Product.deleteMany({ _id: { $in: productIds } });
    await mongoose.connection.close();
  });

  describe('creating a style', () => {
    it('makes every colour and size combination, with its own opening stock and inventory record', async () => {
      const product = await made(
        base('Grid', {
          colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }, { name: 'Black', hex: '#111111', imageIndex: 1 }],
          sizes: ['UK 8', 'UK 9', 'UK 10'],
          variants: [
            v('TAN8', 'Tan', 'UK 8', 4), v('TAN9', 'Tan', 'UK 9', 6), v('TAN10', 'Tan', 'UK 10', 0),
            v('BLK8', 'Black', 'UK 8', 9, '#111111'), v('BLK9', 'Black', 'UK 9', 2, '#111111'), v('BLK10', 'Black', 'UK 10', 7, '#111111'),
          ],
        })
      );

      expect(product.variants).toHaveLength(6);
      expect(product.colors.map((c: any) => c.name)).toEqual(['Tan', 'Black']);
      expect(product.sizes).toEqual(['UK 8', 'UK 9', 'UK 10']);
      expect(await stockOf(`${skuPrefix}-TAN9`)).toEqual({ available: 6, reserved: 0 });
      expect(await stockOf(`${skuPrefix}-TAN10`)).toEqual({ available: 0, reserved: 0 }); // sold out from the start is allowed
      expect(await stockOf(`${skuPrefix}-BLK8`)).toEqual({ available: 9, reserved: 0 });
    });

    it('reads the colours and sizes off the variants when they are not listed, and fixes each variant\'s swatch', async () => {
      const product = await made(base('Derived', { variants: [v('D1', 'Olive', 'UK 9', 3, '#556B2F'), v('D2', 'Olive', 'UK 7', 3, '#556B2F'), v('D3', 'Navy', 'UK 7', 3, '#001F5B')] }));

      expect(product.colors.map((c: any) => [c.name, c.hex])).toEqual([['Olive', '#556B2F'], ['Navy', '#001F5B']]);
      expect(product.sizes).toEqual(['UK 7', 'UK 9']); // in shoe-size order, not the order typed

      // A variant sent with the wrong swatch takes its colour's
      const wrong = await made(base('Swatch', { colors: [{ name: 'Rust', hex: '#B7410E', imageIndex: 0 }], sizes: ['UK 8'], variants: [v('S1', 'Rust', 'UK 8', 2, '#000000')] }));
      expect(wrong.variants[0].colorHex).toBe('#B7410E');
    });

    it('refuses a style that could not be sold or would be confusing', async () => {
      const refusals: [string, any, RegExp][] = [
        ['no variants', base('NoVar'), /at least one size and colour/i],
        ['colour not listed', base('Ghost', { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }], sizes: ['UK 8'], variants: [v('G1', 'Blue', 'UK 8')] }), /uses the colour "Blue"/],
        ['size not listed', base('Size', { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }], sizes: ['UK 8'], variants: [v('Z1', 'Tan', 'UK 11')] }), /size UK 11, which the style does not list/],
        ['same colour and size twice', base('Twice', { variants: [v('T1', 'Tan', 'UK 8'), v('T2', 'Tan', 'UK 8')] }), /more than one Tan variant in UK 8/],
        ['same SKU twice', base('SameSku', { variants: [v('U1', 'Tan', 'UK 8'), v('U1', 'Tan', 'UK 9')] }), /own SKU/],
        ['colour with no sizes', base('Empty', { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }, { name: 'Pink', hex: '#FFC0CB', imageIndex: 0 }], sizes: ['UK 8'], variants: [v('E1', 'Tan', 'UK 8')] }), /Colour "Pink" has no sizes/],
        ['size with no colours', base('NoColour', { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }], sizes: ['UK 8', 'UK 9'], variants: [v('N1', 'Tan', 'UK 8')] }), /Size UK 9 has no colours/],
        ['image that is not there', base('Img', { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 5 }], sizes: ['UK 8'], variants: [v('I1', 'Tan', 'UK 8')] }), /points at image 6/],
        ['two colours with one name', base('Dup', { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }, { name: 'Tan', hex: '#AA6633', imageIndex: 1 }], sizes: ['UK 8'], variants: [v('P1', 'Tan', 'UK 8')] }), /same name/],
        ['negative stock', base('Neg', { variants: [v('X1', 'Tan', 'UK 8', -3)] }), /cannot be negative/],
        ['stock with decimals', base('Dec', { variants: [{ ...v('X2', 'Tan', 'UK 8'), stock: 2.5 }] }), /whole number/],
        ['bad swatch', base('Hex', { variants: [v('X3', 'Tan', 'UK 8', 1, 'brown')] }), /hex value/],
      ];
      for (const [label, body, message] of refusals) {
        const res = await create(body);
        expect([label, res.status]).toEqual([label, 400]);
        expect([label, res.body.error]).toEqual([label, expect.stringMatching(message)]);
      }
      // None of them left a product or stock behind
      expect(await Product.countDocuments({ name: new RegExp(`^Variant Test (NoVar|Ghost|Size|Twice|SameSku|Empty|NoColour|Img|Dup|Neg|Dec|Hex) ${stamp}$`) })).toBe(0);
    });
  });

  describe('editing a style', () => {
    it('adds a new size and a new colour, with opening stock, leaving existing stock and holds alone', async () => {
      const product = await made(
        base('Grow', { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }], sizes: ['UK 8', 'UK 9'], variants: [v('R8', 'Tan', 'UK 8', 10), v('R9', 'Tan', 'UK 9', 10)] })
      );
      // Pretend two pairs are held for unpaid orders
      await Inventory.updateOne({ variantSku: `${skuPrefix}-R8` }, { $set: { availableStock: 8, reservedStock: 2 } });

      const res = await edit(product._id, {
        colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }, { name: 'Black', hex: '#111111', imageIndex: 1 }],
        sizes: ['UK 8', 'UK 9', 'UK 10'],
        variants: [v('R10', 'Tan', 'UK 10', 5), v('B8', 'Black', 'UK 8', 7, '#000000'), v('B9', 'Black', 'UK 9', 3, '#111111'), v('B10', 'Black', 'UK 10', 1, '#111111')],
      });
      expect(res.status).toBe(200);
      expect(res.body.product.variants).toHaveLength(6);
      expect(res.body.product.colors).toHaveLength(2);

      expect(await stockOf(`${skuPrefix}-R10`)).toEqual({ available: 5, reserved: 0 });
      expect(await stockOf(`${skuPrefix}-B8`)).toEqual({ available: 7, reserved: 0 });
      expect(await stockOf(`${skuPrefix}-R8`)).toEqual({ available: 8, reserved: 2 }); // untouched, holds included
      expect(res.body.product.variants.find((x: any) => x.sku === `${skuPrefix}-B8`).colorHex).toBe('#111111');
    });

    it('does not reset the stock of a variant that is sent again with a different number', async () => {
      const product = await made(base('Resend', { variants: [v('RS1', 'Tan', 'UK 8', 10)] }));
      const res = await edit(product._id, { variants: [{ ...v('RS1', 'Tan', 'UK 8'), stock: 999 }] });
      expect(res.status).toBe(200);
      expect(await stockOf(`${skuPrefix}-RS1`)).toEqual({ available: 10, reserved: 0 });
    });

    it('will not take away a colour or size that still has variants, or add a variant that does not fit', async () => {
      const product = await made(
        base('Keep', { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }, { name: 'Black', hex: '#111111', imageIndex: 1 }], sizes: ['UK 8', 'UK 9'], variants: [v('K1', 'Tan', 'UK 8'), v('K2', 'Black', 'UK 9', 4, '#111111')] })
      );

      const dropColour = await edit(product._id, { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }] });
      expect(dropColour.status).toBe(400);
      expect(dropColour.body.error).toMatch(/Colour "Black" is used by 1 variant, so it cannot be removed/);

      const dropSize = await edit(product._id, { sizes: ['UK 8'] });
      expect(dropSize.status).toBe(400);
      expect(dropSize.body.error).toMatch(/Size UK 9 is used by 1 variant/);

      const orphan = await edit(product._id, { variants: [v('K3', 'Green', 'UK 8')] });
      expect(orphan.status).toBe(400);
      expect(orphan.body.error).toMatch(/uses the colour "Green"/);

      const clash = await edit(product._id, { variants: [v('K4', 'Tan', 'UK 8')] });
      expect(clash.status).toBe(400);
      expect(clash.body.error).toMatch(/more than one Tan variant in UK 8/);

      const fewerImages = await edit(product._id, { images: [IMG] }); // Black points at image 2
      expect(fewerImages.status).toBe(400);
      expect(fewerImages.body.error).toMatch(/points at image 2, but the style has 1 image/);

      // Nothing from the refused edits was saved
      const fresh = await Product.findById(product._id).lean();
      expect(fresh!.variants).toHaveLength(2);
      expect(await stockOf(`${skuPrefix}-K3`)).toBeNull();
      expect(await stockOf(`${skuPrefix}-K4`)).toBeNull();
    });

    it('refuses an SKU that another style already uses', async () => {
      const a = await made(base('OwnerA', { variants: [v('OA1', 'Tan', 'UK 8', 3)] }));
      const b = await made(base('OwnerB', { variants: [v('OB1', 'Tan', 'UK 8', 3)] }));
      const res = await edit(b._id, { colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }, { name: 'Grey', hex: '#888888', imageIndex: 0 }], variants: [v('OA1', 'Grey', 'UK 8')] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(new RegExp(`SKU ${skuPrefix}-OA1 is already used by "Variant Test OwnerA`));
      expect(await stockOf(`${skuPrefix}-OA1`)).toEqual({ available: 3, reserved: 0 });
      expect(a._id).toBeDefined();
    });

    it('lets an unrelated edit through even when the style carries an older gap', async () => {
      // An older style listing a size no colour has (as the previous admin form used to create)
      const legacy = await Product.create({
        name: `Variant Test Legacy ${stamp}`, slug: `variant-test-legacy-${stamp}`, description: 'An older style with a size nobody can buy',
        category: 'Loafers', price: 3000, originalPrice: 3500, images: [IMG], colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }],
        sizes: ['UK 8', 'UK 9'], variants: [{ sku: `${skuPrefix}-LG1`, size: 'UK 8', color: 'Tan', colorHex: '#8C4E28', stock: 5 }],
      });
      productIds.push(legacy.id);

      const res = await edit(legacy.id, { description: 'A better description for the older style' });
      expect(res.status).toBe(200);
      expect(res.body.product.description).toBe('A better description for the older style');
    });
  });
});
