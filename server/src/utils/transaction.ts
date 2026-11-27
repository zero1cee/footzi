import mongoose, { ClientSession } from 'mongoose';

/**
 * Checks whether the current MongoDB deployment topology supports ACID transactions
 * (Replica Set Primary, Sharded Mongos, or Load-Balanced Cluster).
 */
export const supportsTransactions = (): boolean => {
  try {
    const client = mongoose.connection?.getClient?.();
    const topology = (client as any)?.topology;
    if (!topology) return false;
    const desc = topology.description;
    if (!desc) return false;

    const validTopologyTypes = ['ReplicaSetWithPrimary', 'Sharded', 'LoadBalanced'];
    if (validTopologyTypes.includes(desc.type)) return true;

    if (desc.servers) {
      for (const server of desc.servers.values()) {
        if (['RSPrimary', 'Mongos', 'LoadBalancer'].includes(server.type)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Executes a unit of work inside a MongoDB transaction when supported by the cluster
 * (e.g. MongoDB Atlas, Replica Sets in production / staging).
 *
 * If the current MongoDB instance is a standalone node (such as local development
 * or CI containers without replica set configurations), it executes the operation directly
 * without throwing a transaction-not-supported error.
 */
export const runInTransaction = async <T>(
  work: (session?: ClientSession) => Promise<T>
): Promise<T> => {
  if (!supportsTransactions()) {
    return work();
  }

  let session: ClientSession;
  try {
    session = await mongoose.startSession();
  } catch {
    return work();
  }

  try {
    session.startTransaction();
  } catch {
    await session.endSession().catch(() => {});
    return work();
  }

  try {
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction().catch(() => {});

    // If standalone or un-configured replica set threw an illegal transaction error, fallback gracefully
    if (
      typeof error?.message === 'string' &&
      error.message.includes('Transaction numbers are only allowed on a replica set member or mongos')
    ) {
      return work();
    }

    throw error;
  } finally {
    await session.endSession().catch(() => {});
  }
};
