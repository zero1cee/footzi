import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PincodeEstimator, calculateEstimate } from '@/components/ui/PincodeEstimator';
import { OrderTrackingStepper } from '@/components/ui/OrderTrackingStepper';
import { numberToIndianWords, getIndianStateCode } from '@/lib/utils';

describe('Business Features: Indian GST & Pincode Logistics', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Pincode Logistics & Delivery Estimation Engine', () => {
    it('accurately resolves local Agra atelier PIN codes', () => {
      const est = calculateEstimate('282001');
      expect(est).not.toBeNull();
      expect(est?.city).toBe('Agra');
      expect(est?.state).toBe('Uttar Pradesh');
      expect(est?.zone).toBe('Local');
      expect(est?.courier).toBe('Delhivery Express');
      expect(est?.isExpress).toBe(true);
    });

    it('accurately resolves Delhi NCR express routes', () => {
      const est = calculateEstimate('110001');
      expect(est).not.toBeNull();
      expect(est?.city).toBe('Delhi NCR');
      expect(est?.zone).toBe('NCR/North');
      expect(est?.isExpress).toBe(true);
    });

    it('accurately resolves Major Metro air routes (e.g. Bengaluru, Mumbai)', () => {
      const blr = calculateEstimate('560001');
      expect(blr).not.toBeNull();
      expect(blr?.city).toBe('Bengaluru');
      expect(blr?.zone).toBe('Metro Air');
      expect(blr?.isExpress).toBe(true);

      const bom = calculateEstimate('400001');
      expect(bom).not.toBeNull();
      expect(bom?.city).toBe('Mumbai');
      expect(bom?.zone).toBe('Metro Air');
    });

    it('rejects invalid, short, non-numeric or 0-starting PIN codes', () => {
      expect(calculateEstimate('')).toBeNull();
      expect(calculateEstimate('12345')).toBeNull(); // 5 digits
      expect(calculateEstimate('012345')).toBeNull(); // Starts with 0
      expect(calculateEstimate('ABCDEF')).toBeNull();
      expect(calculateEstimate('2820010')).toBeNull(); // 7 digits
    });
  });

  describe('Indian Currency to Words (Tax Invoice Mandate)', () => {
    it('converts common footwear amounts to formal Indian words', () => {
      expect(numberToIndianWords(4899)).toBe('Four Thousand Eight Hundred Ninety-Nine Rupees Only');
      expect(numberToIndianWords(3500)).toBe('Three Thousand Five Hundred Rupees Only');
      expect(numberToIndianWords(12500)).toBe('Twelve Thousand Five Hundred Rupees Only');
      expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
    });
  });

  describe('Indian State GST Codes Resolution', () => {
    it('resolves standard 2-digit GST state codes', () => {
      expect(getIndianStateCode('Uttar Pradesh')).toBe('09');
      expect(getIndianStateCode('UP')).toBe('09');
      expect(getIndianStateCode('Delhi')).toBe('07');
      expect(getIndianStateCode('Maharashtra')).toBe('27');
      expect(getIndianStateCode('Karnataka')).toBe('29');
      expect(getIndianStateCode('Tamil Nadu')).toBe('33');
      expect(getIndianStateCode('West Bengal')).toBe('19');
      expect(getIndianStateCode('Gujarat')).toBe('24');
    });
  });

  describe('PincodeEstimator UI Component', () => {
    it('renders the initial input and check button', () => {
      render(<PincodeEstimator />);
      expect(screen.getByText(/Delivery & Atelier Serviceability/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter 6-digit Indian PIN code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
    });

    it('shows estimated delivery when a valid PIN is entered and persists to localStorage', () => {
      render(<PincodeEstimator />);
      const input = screen.getByPlaceholderText(/Enter 6-digit Indian PIN code/i);
      fireEvent.change(input, { target: { value: '282001' } });
      fireEvent.click(screen.getByRole('button', { name: /check/i }));

      expect(screen.getByText(/Estimated Delivery by/i)).toBeInTheDocument();
      expect(screen.getByText(/Delivering to/i)).toHaveTextContent('Agra');
      expect(screen.getByText(/Fulfilled by Delhivery Express/i)).toBeInTheDocument();
      expect(localStorage.getItem('footzi_shipping_pincode')).toBe('282001');

      // Click "Change PIN" to reset
      fireEvent.click(screen.getByRole('button', { name: /change pin/i }));
      expect(screen.getByPlaceholderText(/Enter 6-digit Indian PIN code/i)).toBeInTheDocument();
      expect(localStorage.getItem('footzi_shipping_pincode')).toBeNull();
    });

    it('displays error on invalid PIN code submission', () => {
      render(<PincodeEstimator />);
      const input = screen.getByPlaceholderText(/Enter 6-digit Indian PIN code/i);
      fireEvent.change(input, { target: { value: '123' } });
      fireEvent.click(screen.getByRole('button', { name: /check/i }));

      expect(screen.getByText(/Please enter a valid 6-digit Indian postal code/i)).toBeInTheDocument();
    });
  });

  describe('OrderTrackingStepper & Delhivery Logistics Milestones', () => {
    it('renders the 5 atelier & logistics milestones with active status', () => {
      render(
        <OrderTrackingStepper
          orderStatus="processing"
          paymentStatus="paid"
          trackingNumber="DLV-AGR-88231456IN"
          destinationCity="Mumbai"
        />
      );

      expect(screen.getByText('Order Placed')).toBeInTheDocument();
      expect(screen.getByText('Guild Accepted')).toBeInTheDocument();
      expect(screen.getByText('Artisan Hand-Crafting')).toBeInTheDocument();
      expect(screen.getByText('Dispatched via Delhivery')).toBeInTheDocument();
      expect(screen.getByText('Doorstep Handover')).toBeInTheDocument();
      expect(screen.getByText('Current Status')).toBeInTheDocument();
    });

    it('renders Delhivery live waybill tracking card and external link', () => {
      render(
        <OrderTrackingStepper
          orderStatus="shipped"
          paymentStatus="paid"
          trackingNumber="DLV-AGR-88231456IN"
          carrier="Delhivery Express"
          destinationCity="Bengaluru"
        />
      );

      expect(screen.getByText('Delhivery Express')).toBeInTheDocument();
      expect(screen.getByText('DLV-AGR-88231456IN')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /track on delhivery\.com/i });
      expect(link).toHaveAttribute(
        'href',
        'https://www.delhivery.com/track/package/DLV-AGR-88231456IN'
      );
    });

    it('renders clean cancellation card when order is cancelled', () => {
      render(
        <OrderTrackingStepper
          orderStatus="cancelled"
          paymentStatus="refunded"
        />
      );

      expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
      expect(screen.getByText(/initiated back to your original payment method/i)).toBeInTheDocument();
      expect(screen.queryByText('Dispatched via Delhivery')).not.toBeInTheDocument();
    });
  });
});
