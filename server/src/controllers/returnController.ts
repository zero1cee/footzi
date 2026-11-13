import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { returnService, RETURN_REASONS } from '../services/returnService.js';
import { isAdminRole } from '../middleware/auth.js';

const SHOE_SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'] as const;

const createReturnSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  type: z.enum(['return', 'exchange']).default('exchange'),
  customerComments: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().int().min(1).max(10).default(1),
        reason: z.enum(RETURN_REASONS),
        replacementSize: z.enum(SHOE_SIZES).optional(),
      })
    )
    .min(1, 'Select at least one item')
    .max(10),
});

const updateReturnSchema = z.object({
  status: z.enum([
    'requested',
    'approved',
    'pickup_scheduled',
    'inspected',
    'replacement_dispatched',
    'refund_processed',
    'rejected',
  ]),
  adminNotes: z.string().max(500).optional(),
  replacementTrackingNumber: z.string().max(40).optional(),
});

export const createReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const data = createReturnSchema.parse(req.body);

    const returnReq = await returnService.createReturnRequest(userId, data);

    res.status(201).json({
      message: `${data.type === 'exchange' ? 'Size exchange' : 'Return'} request registered successfully`,
      returnRequest: returnReq,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid request', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const getMyReturns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const requests = await returnService.getUserReturns(userId);
    res.status(200).json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getReturnById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const request = await returnService.getReturnById(id);

    if (!request) {
      res.status(404).json({ error: 'Return request not found' });
      return;
    }

    // Must be owner or admin
    if (
      !isAdminRole(req.user!.role) &&
      request.user._id.toString() !== req.user!._id.toString()
    ) {
      res.status(403).json({ error: 'Access denied to this return record' });
      return;
    }

    res.status(200).json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllReturnsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const returns = await returnService.getAllReturns(req.query);
    res.status(200).json(returns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateReturnStatusAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, adminNotes, replacementTrackingNumber } = updateReturnSchema.parse(req.body);

    const updated = await returnService.updateReturnStatus(id, status, adminNotes, replacementTrackingNumber);

    res.status(200).json({
      message: `Return request transitioned to ${status}`,
      returnRequest: updated,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid status', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};
