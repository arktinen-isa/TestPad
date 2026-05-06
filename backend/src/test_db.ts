import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing Form Creation...')
    // Get a user to assign as creator
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('No user found to create a form.')
      return
    }

    const form = await prisma.form.create({
      data: {
        title: 'Test Form',
        description: 'Test Description',
        status: 'DRAFT',
        createdById: user.id,
        fields: {
          create: [
            { label: 'First Question', type: 'TEXT', required: true, order: 0 }
          ]
        }
      },
      include: { fields: true }
    })
    console.log('Created Form:', form)

    console.log('Testing Form Update (deleteMany and create)...')
    const updatedForm = await prisma.form.update({
      where: { id: form.id },
      data: {
        title: 'Test Form Updated',
        fields: {
          deleteMany: {},
          create: [
            { label: 'Updated Question', type: 'TEXT', required: true, order: 0 }
          ]
        }
      },
      include: { fields: true }
    })
    console.log('Updated Form:', updatedForm)

    // Clean up
    console.log('Cleaning up test form...')
    await prisma.form.delete({ where: { id: form.id } })
    console.log('Cleaned up successfully!')

  } catch (err) {
    console.error('Error during form test:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
