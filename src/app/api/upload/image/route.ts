import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { requireAuth } from '@/lib/auth-middleware'
import { apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * POST /api/upload/image
 * 
 * Upload an image file
 * Access: GUILD_MASTER and COUNCIL (content editors)
 * Returns: { url: string } - The URL to access the uploaded image
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  // Only GUILD_MASTER and COUNCIL can upload images
  const user = authResult.user
  if (user.rank !== 'GUILD_MASTER' && user.rank !== 'COUNCIL') {
    return apiError(
      'Only Guild Master and Council can upload images',
      HttpStatus.FORBIDDEN
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return apiError('No image file provided', HttpStatus.BAD_REQUEST)
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return apiError(
        'Invalid file type. Allowed: JPEG, PNG, GIF, WebP',
        HttpStatus.BAD_REQUEST
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return apiError('File size exceeds 5MB limit', HttpStatus.BAD_REQUEST)
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'images')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${fileExtension}`

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = path.join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    console.log('✅ Image uploaded successfully:', filename)

    // Return the URL to access the image
    const imageUrl = `/uploads/images/${filename}`

    return NextResponse.json(
      {
        success: true,
        data: { url: imageUrl },
        message: 'Image uploaded successfully'
      },
      { status: HttpStatus.CREATED }
    )
  } catch (error: any) {
    console.error('Image upload error:', error)
    console.error('Error stack:', error?.stack)
    return apiError(
      `Failed to upload image: ${error?.message || 'Unknown error'}`, 
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }
}
