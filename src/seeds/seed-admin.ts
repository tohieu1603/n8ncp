import 'reflect-metadata'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { AppDataSource } from '../data-source'
import { User } from '../entities'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@imagegen.ai'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin'

async function seedAdmin() {
  try {
    await AppDataSource.initialize()
    console.log('Database connected')

    const userRepo = AppDataSource.getRepository(User)

    // Check if admin user exists
    const existingAdmin = await userRepo.findOne({
      where: { email: ADMIN_EMAIL },
    })

    if (existingAdmin) {
      // Update to admin role if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin'
        existingAdmin.isPro = true
        existingAdmin.tokenBalance = 1000000
        existingAdmin.isEmailVerified = true
        await userRepo.save(existingAdmin)
        console.log('Existing user updated to admin:', existingAdmin.email)
      } else {
        console.log('Admin user already exists:', existingAdmin.email)
      }
      await AppDataSource.destroy()
      return
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
    const adminUser = userRepo.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: 'admin',
      creditsUsed: 0,
      totalSpentUsd: 0,
      tokenBalance: 1000000, // 1M tokens for admin
      isPro: true,
      isActive: true,
      isEmailVerified: true,
    })

    await userRepo.save(adminUser)
    console.log('Admin user created successfully!')
    console.log('Email:', ADMIN_EMAIL)
    console.log('Password:', ADMIN_PASSWORD)
    console.log('Role: admin')
    console.log('Token Balance: 1,000,000')

    await AppDataSource.destroy()
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

seedAdmin()
