import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { returnService } from '../services/returnService.js';

export const createReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const { orderId, type, items, customerComments } = req.body;

    if (!orderId || !items) {
      res.status(400).json({ error: 'Order ID and items are required' });
      return;
    }

    const returnReq = await returnService.createReturnRequest(userId, {
      orderId,
      type: type || 'exchange',
      items,
      customerComments,
    });

    res.status(201).json({
      message: `${type === 'exchange' ? 'Size exchange' : 'Return'} request registered successfully`,
      returnRequest: returnReq,
    });
  } catch (error: any) {
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
      req.user!.role !== 'admin' &&
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
    const { status, adminNotes, replacementTrackingNumber } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Target status is required' });
      return;
    }

    const updated = await returnService.updateReturnStatus(
      id,
      status,
      adminNotes,
      replacementTrackingNumber
    );

    res.status(200).json({
      message: `Return request transitioned to ${status}`,
      returnRequest: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
