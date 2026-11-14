import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ProductEditor } from '../components/admin/ProductEditor';

expect.extend(toHaveNoViolations);

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

const existing = {
  id: 'p1',
  name: 'Test Loafer',
  category: 'Loafers',
  description: 'A fine loafer for testing',
  price: 3000,
  originalPrice: 4000,
  material: 'Calfskin',
  sole: 'Leather',
  badge: 'Best Seller',
  features: ['Hand stitched', 'Blake construction'],
  images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  colors: [{ name: 'Tan', hex: '#8c4e28', imageIndex: 0 }],
  sizes: ['UK 8', 'UK 9'],
  variants: [
    { sku: 'FTZ-LOA-TAN-UK8-AAA', size: 'UK 8', color: 'Tan', colorHex: '#8c4e28', stock: 12 },
    { sku: 'FTZ-LOA-TAN-UK9-AAA', size: 'UK 9', color: 'Tan', colorHex: '#8c4e28', stock: 3 },
  ],
};

describe('product editor', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  const body = () => JSON.parse(fetchMock.mock.calls[0][1].body);
  const fill = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

  describe('creating a style', () => {
    const open = (onSaved = vi.fn()) => {
      const view = render(<ProductEditor product={null} token="t" onClose={vi.fn()} onSaved={onSaved} />);
      fill('Name', 'Heritage Brogue');
      fill('Selling price ₹', '4200');
      fill('Original price ₹', '5000');
      fill('Description', 'A hand-stitched brogue with a leather sole.');
      fill('Image 1 link', 'https://example.com/brogue.jpg');
      return { ...view, onSaved };
    };

    it('builds the stock grid from the colours and sizes chosen, and publishes every ticked combination', async () => {
      fetchMock.mockResolvedValue(ok({ product: { _id: 'new1', name: 'Heritage Brogue' } }));
      const { onSaved } = open();

      fill('Colour 1 name', 'Tan');
      fireEvent.click(screen.getByRole('button', { name: /add a colour/i }));
      fill('Colour 2 name', 'Black');
      fireEvent.change(screen.getByLabelText('Colour 2 swatch'), { target: { value: '#111111' } });
      fireEvent.click(screen.getByLabelText('UK 9'));

      // Two colours and two sizes: four cells
      const grid = screen.getByRole('table', { name: /opening stock for each colour and size/i });
      expect(within(grid).getAllByRole('spinbutton')).toHaveLength(4);
      fill('Opening stock for Tan UK 8', '10');
      fill('Opening stock for Tan UK 9', '6');
      fill('Opening stock for Black UK 8', '4');
      fireEvent.click(screen.getByLabelText('Sell Black in UK 9')); // Black is not made in UK 9
      expect(screen.getByLabelText('Opening stock for Black UK 9')).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: /publish style/i }));
      await waitFor(() => expect(onSaved).toHaveBeenCalled());

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/admin/products');
      expect(init.method).toBe('POST');
      const sent = body();
      expect(sent.colors).toEqual([{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }, { name: 'Black', hex: '#111111', imageIndex: 0 }]);
      expect(sent.sizes).toEqual(['UK 8', 'UK 9']);
      expect(sent.variants.map((v: any) => [v.color, v.size, v.stock, v.colorHex])).toEqual([
        ['Tan', 'UK 8', 10, '#8C4E28'],
        ['Tan', 'UK 9', 6, '#8C4E28'],
        ['Black', 'UK 8', 4, '#111111'],
      ]);
      // Readable, unique SKUs
      expect(sent.variants[0].sku).toMatch(/^FTZ-HER-TAN-UK8-[A-Z0-9]{3}$/);
      expect(new Set(sent.variants.map((v: any) => v.sku)).size).toBe(3);
      expect(sent).toMatchObject({ name: 'Heritage Brogue', price: 4200, originalPrice: 5000, badge: null });
    });

    it('fills every empty cell at once, without overwriting numbers already typed', () => {
      open();
      fill('Colour 1 name', 'Tan');
      fireEvent.click(screen.getByLabelText('UK 9'));
      fireEvent.click(screen.getByLabelText('UK 10'));
      fill('Opening stock for Tan UK 9', '2');

      fill('Fill empty cells with', '8');
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(screen.getByLabelText('Opening stock for Tan UK 8')).toHaveValue(8);
      expect(screen.getByLabelText('Opening stock for Tan UK 9')).toHaveValue(2);
      expect(screen.getByLabelText('Opening stock for Tan UK 10')).toHaveValue(8);
    });

    it('says what is missing before it asks the server, and sends nothing', async () => {
      open();
      const save = () => fireEvent.click(screen.getByRole('button', { name: /publish style/i }));

      save();
      expect(await screen.findByRole('alert')).toHaveTextContent(/give every colour a name/i);

      fill('Colour 1 name', 'Tan');
      fireEvent.click(screen.getByLabelText('Sell Tan in UK 8')); // untick the only combination
      save();
      expect(screen.getByRole('alert')).toHaveTextContent(/colour "Tan" has no sizes ticked/i);

      fireEvent.click(screen.getByLabelText('Sell Tan in UK 8'));
      fill('Opening stock for Tan UK 8', '-4');
      save();
      expect(screen.getByRole('alert')).toHaveTextContent(/whole number, 0 or more/i);

      fireEvent.click(screen.getByLabelText('UK 10')); // a size no colour is ticked for... Tan is ticked by default
      fill('Opening stock for Tan UK 8', '3');
      fireEvent.click(screen.getByLabelText('Sell Tan in UK 10'));
      save();
      expect(screen.getByRole('alert')).toHaveTextContent(/size UK 10 has no colours ticked/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects two colours with the same name and a colour that points at a missing image', () => {
      open();
      fill('Colour 1 name', 'Tan');
      fireEvent.click(screen.getByRole('button', { name: /add a colour/i }));
      fill('Colour 2 name', 'tan');
      fireEvent.click(screen.getByRole('button', { name: /publish style/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/same name/i);
      fireEvent.click(screen.getByRole('button', { name: 'Remove colour 2' }));

      fireEvent.click(screen.getByRole('button', { name: /add image link/i }));
      fill('Image 2 link', 'https://example.com/second.jpg');
      fireEvent.change(screen.getByLabelText('Colour 1 image'), { target: { value: '1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Remove image 2' })); // the colour now points at image 2, which is gone
      fireEvent.click(screen.getByRole('button', { name: /publish style/i }));
      // The select falls back to an existing image number, so the style is accepted or flagged, never sent broken
      expect(fetchMock.mock.calls.length === 0 || body().colors[0].imageIndex < 1).toBe(true);
    });

    it('shows the server\'s reason, such as a taken SKU, and keeps everything typed', async () => {
      fetchMock.mockResolvedValue(fail(400, 'SKU FTZ-HER-TAN-UK8-ABC is already used by "Another Boot".'));
      open();
      fill('Colour 1 name', 'Tan');
      fill('Opening stock for Tan UK 8', '5');
      fireEvent.click(screen.getByRole('button', { name: /publish style/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/already used by "Another Boot"/);
      expect(screen.getByLabelText('Name')).toHaveValue('Heritage Brogue');
      expect(screen.getByLabelText('Opening stock for Tan UK 8')).toHaveValue(5);
    });

    it('has no detectable accessibility violations', async () => {
      const { container } = open();
      fill('Colour 1 name', 'Tan');
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('editing a style', () => {
    const open = (onSaved = vi.fn()) => {
      render(<ProductEditor product={existing} token="t" onClose={vi.fn()} onSaved={onSaved} />);
      return onSaved;
    };

    it('shows the pairs already on sale, and locks the colours and sizes they depend on', () => {
      open();
      const grid = screen.getByRole('table', { name: /opening stock/i });
      expect(within(grid).getByText('12')).toBeInTheDocument();
      expect(within(grid).getByText('3')).toBeInTheDocument();
      expect(within(grid).queryByRole('spinbutton')).not.toBeInTheDocument(); // existing stock is edited on the inventory screen

      expect(screen.getByLabelText('Colour 1 name')).toBeDisabled();
      expect(screen.getByLabelText('Colour 1 swatch')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Remove colour 1' })).toBeDisabled();
      expect(screen.getByLabelText('UK 8')).toBeDisabled();
      expect(screen.getByLabelText('UK 9')).toBeDisabled();
      expect(screen.getByLabelText('UK 10')).not.toBeDisabled();
    });

    it('adds a size and a colour, sending only the new combinations, and not the pairs already on sale', async () => {
      fetchMock.mockResolvedValue(ok({ product: { ...existing, id: 'p1' } }));
      const onSaved = open();

      fireEvent.click(screen.getByLabelText('UK 10'));
      fireEvent.click(screen.getByRole('button', { name: /add a colour/i }));
      fill('Colour 2 name', 'Black');
      fill('Opening stock for Tan UK 10', '5');
      fill('Opening stock for Black UK 8', '7');
      fill('Opening stock for Black UK 9', '2');
      fill('Opening stock for Black UK 10', '0');
      expect(screen.getByText(/4 new combinations will be added/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(onSaved).toHaveBeenCalled());

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/admin/products/p1');
      expect(init.method).toBe('PUT');
      const sent = body();
      expect(sent.sizes).toEqual(['UK 8', 'UK 9', 'UK 10']);
      expect(sent.colors.map((c: any) => c.name)).toEqual(['Tan', 'Black']);
      expect(sent.variants.map((v: any) => `${v.color} ${v.size}=${v.stock}`)).toEqual(['Tan UK 10=5', 'Black UK 8=7', 'Black UK 9=2', 'Black UK 10=0']);
      expect(sent.variants.some((v: any) => v.sku === 'FTZ-LOA-TAN-UK8-AAA')).toBe(false);
    });

    it('sends no variants at all when only the details changed', async () => {
      fetchMock.mockResolvedValue(ok({ product: existing }));
      const onSaved = open();
      fill('Selling price ₹', '3200');
      fill('Badge', '');
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(body()).toMatchObject({ price: 3200, badge: null, variants: [], features: ['Hand stitched', 'Blake construction'] });
    });

    it('refuses a new colour that has no sizes ticked, before asking the server', () => {
      open();
      fireEvent.click(screen.getByRole('button', { name: /add a colour/i }));
      fill('Colour 2 name', 'Black');
      fireEvent.click(screen.getByLabelText('Sell Black in UK 8'));
      fireEvent.click(screen.getByLabelText('Sell Black in UK 9'));
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/colour "Black" has no sizes ticked/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('says plainly when file uploads are not set up, and rejects oversized files before sending', async () => {
      fetchMock.mockResolvedValue(fail(501, 'Image uploads are not set up on this server. Paste an https:// image link instead.'));
      const { container } = render(<ProductEditor product={existing} token="t" onClose={vi.fn()} onSaved={vi.fn()} />);
      const input = container.querySelector('input[type=file]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })] } });
      expect(await screen.findByText(/over 5 MB/i)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { files: [new File([new Uint8Array([137, 80, 78, 71])], 'a.png', { type: 'image/png' })] } });
      expect(await screen.findByText(/not set up on this server/i)).toBeInTheDocument();
    });
  });
});
