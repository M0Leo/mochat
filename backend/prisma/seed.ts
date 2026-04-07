import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, User } from '../generated/prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  console.log('Starting seed...')

  const hashedPassword = await argon2.hash('password')

  const users: User[] = []
  for (let i = 1; i <= 20; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@example.com`,
        username: `user${i}`,
        displayName: `User ${i}`,
        password: hashedPassword,
        bio: `Bio for user ${i}`,
        phone: `+123456789${String(i).padStart(2, '0')}`,
        isOnline: Math.random() > 0.5,
      },
    })
    users.push(user)
  }
  console.log(`Created ${users.length} users`)

  const chat1 = await prisma.chat.create({
    data: {
      title: 'General Chat',
      type: 'PUBLIC_GROUP',
      participants: {
        create: users.slice(0, 10).map((u) => ({
          userId: u.id,
        })),
      },
    },
  })

  const chat2 = await prisma.chat.create({
    data: {
      title: 'Tech Talk',
      type: 'PUBLIC_GROUP',
      participants: {
        create: users.slice(5, 15).map((u) => ({
          userId: u.id,
        })),
      },
    },
  })

  const chat3 = await prisma.chat.create({
    data: {
      title: 'Random',
      type: 'PUBLIC_GROUP',
      participants: {
        create: users.slice(10, 20).map((u) => ({
          userId: u.id,
        })),
      },
    },
  })

  const directChat = await prisma.chat.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [
          { userId: users[0].id },
          { userId: users[1].id },
        ],
      },
    },
  })

  console.log('Created 4 chats')

  const messageContents = [
    'Hello everyone!',
    'How are you doing?',
    'What are you working on?',
    'Did you see the meeting notes?',
    'Great job!',
    'Let me know when you are free',
    'Thanks for the update',
    'I will check that later',
    'Can you send me the file?',
    'Sure, no problem',
    'That sounds interesting',
    'Let me think about it',
    'I agree with you',
    'Not sure about that',
    'See you tomorrow!',
  ]

  const chats = [chat1, chat2, chat3, directChat]

  let totalMessages = 0
  for (const chat of chats) {
    const numMessages = Math.floor(Math.random() * 50) + 20
    for (let i = 0; i < numMessages; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)]
      const content = messageContents[Math.floor(Math.random() * messageContents.length)]

      await prisma.message.create({
        data: {
          content,
          senderId: randomUser.id,
          chatId: chat.id,
        },
      })
      totalMessages++
    }

    const lastMessage = await prisma.message.findFirst({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' },
    })

    if (lastMessage) {
      await prisma.chat.update({
        where: { id: chat.id },
        data: { lastMessageAt: lastMessage.createdAt },
      })
    }
  }

  console.log(`Created ${totalMessages} messages`)

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
