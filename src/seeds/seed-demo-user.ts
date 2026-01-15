import 'reflect-metadata'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { AppDataSource } from '../data-source'
import { User } from '../entities'

async function seedDemoUser() {
  try {
    await AppDataSource.initialize()
    console.log('Database connected')

    const userRepo = AppDataSource.getRepository(User)

    // Check if demo user exists
    const existingUser = await userRepo.findOne({
      where: { email: 'demo@imagegen.ai' },
    })

    if (existingUser) {
      console.log('Demo user already exists:', existingUser.email)
      await AppDataSource.destroy()
      return
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123456', 10)
    const demoUser = userRepo.create({
      email: 'demo@imagegen.ai',
      password: hashedPassword,
      name: 'Demo User',
      creditsUsed: 0,
      totalSpentUsd: 0,
      isActive: true,
    })

    await userRepo.save(demoUser)
    console.log('Demo user created successfully!')
    console.log('Email: demo@imagegen.ai')
    console.log('Password: demo123456')

    await AppDataSource.destroy()
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

seedDemoUser()
