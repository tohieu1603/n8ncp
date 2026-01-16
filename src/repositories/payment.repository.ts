import { Payment } from '../entities/payment.entity'
import { BaseRepository } from './base.repository'

/**
 * Repository for Payment entity operations
 */
export class PaymentRepository extends BaseRepository<Payment> {
  constructor() {
    super(Payment)
  }

  async findByUserId(userId: string, limit = 50): Promise<Payment[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit
    })
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    return this.repository.findOne({ where: { transactionId } })
  }

  async findPendingPayments(userId: string): Promise<Payment[]> {
    return this.repository.find({
      where: { userId, status: 'pending' },
      order: { createdAt: 'DESC' }
    })
  }

  async updateStatus(
    paymentId: string,
    status: 'pending' | 'completed' | 'failed',
    transactionId?: string
  ): Promise<void> {
    const update: Partial<Payment> = { status }
    if (transactionId) {
      update.transactionId = transactionId
    }
    await this.repository.update(paymentId, update)
  }

  async getTotalPaidByUser(userId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.userId = :userId', { userId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne()

    return Number(result?.total) || 0
  }
}

// Singleton instance
export const paymentRepository = new PaymentRepository()
