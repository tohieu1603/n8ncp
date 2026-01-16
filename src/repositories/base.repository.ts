import { Repository, EntityTarget, FindOptionsWhere, DeepPartial } from 'typeorm'
import { AppDataSource } from '../data-source'

/**
 * Base repository class providing common database operations
 * All entity-specific repositories should extend this class
 */
export abstract class BaseRepository<T extends { id: string }> {
  protected repository: Repository<T>

  constructor(entity: EntityTarget<T>) {
    this.repository = AppDataSource.getRepository(entity)
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as FindOptionsWhere<T> })
  }

  async findOne(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repository.findOne({ where })
  }

  async findAll(where?: FindOptionsWhere<T>): Promise<T[]> {
    return where ? this.repository.find({ where }) : this.repository.find()
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data)
    return this.repository.save(entity)
  }

  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, data as any)
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id)
    return (result.affected ?? 0) > 0
  }

  async save(entity: T): Promise<T> {
    return this.repository.save(entity)
  }

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return this.repository.count({ where })
  }

  // Access raw repository for complex queries
  get raw(): Repository<T> {
    return this.repository
  }
}
