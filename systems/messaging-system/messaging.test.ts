import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MessagingConfig } from './messaging'
import { MessagingSystem } from './messaging'

describe('MessagingSystem', () => {
  let messaging: MessagingSystem

  beforeEach(() => {
    messaging = new MessagingSystem()
  })

  afterEach(() => {
    messaging.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(messaging).toBeDefined()
      expect(messaging.getStatistics().totalUsers).toBeGreaterThan(0)
    })

    it('should initialize with custom config', () => {
      const config: Partial<MessagingConfig> = {
        maxMessageLength: 500,
        maxFileSize: 5 * 1024 * 1024,
        messageRetentionDays: 7,
        maxParticipantsPerGroup: 25,
        enableTypingIndicators: false,
        enableReadReceipts: false,
        enableMessageEditing: false,
        enableMessageDeletion: false,
      }

      const customMessaging = new MessagingSystem(config)
      expect(customMessaging).toBeDefined()
      customMessaging.destroy()
    })

    it('should initialize with default data', () => {
      const stats = messaging.getStatistics()
      expect(stats.totalUsers).toBeGreaterThan(0)
      expect(stats.totalConversations).toBeGreaterThan(0)
      expect(stats.totalMessages).toBeGreaterThan(0)
    })
  })

  describe('User Management', () => {
    it('should add a user', () => {
      const user = messaging.addUser({
        username: 'testuser',
        displayName: 'Test User',
        status: 'online',
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light',
        },
      })

      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.username).toBe('testuser')
      expect(user.displayName).toBe('Test User')
      expect(user.status).toBe('online')
    })

    it('should add a user with custom id', () => {
      const user = messaging.addUser({
        id: 'custom-id',
        username: 'customuser',
        displayName: 'Custom User',
        status: 'offline',
        preferences: {
          notifications: false,
          soundEnabled: false,
          theme: 'dark',
        },
      })

      expect(user.id).toBe('custom-id')
    })

    it('should update a user', () => {
      const user = messaging.addUser({
        username: 'testuser',
        displayName: 'Test User',
        status: 'online',
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light',
        },
      })

      const updated = messaging.updateUser(user.id, {
        displayName: 'Updated User',
        status: 'away',
      })

      expect(updated).toBeDefined()
      expect(updated?.displayName).toBe('Updated User')
      expect(updated?.status).toBe('away')
      expect(updated?.username).toBe('testuser') // Should preserve unchanged fields
    })

    it('should return null when updating non-existent user', () => {
      const updated = messaging.updateUser('non-existent', {
        displayName: 'Updated',
      })
      expect(updated).toBeNull()
    })

    it('should get a user by id', () => {
      const user = messaging.addUser({
        username: 'testuser',
        displayName: 'Test User',
        status: 'online',
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light',
        },
      })

      const retrieved = messaging.getUser(user.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.username).toBe('testuser')
    })

    it('should return null for non-existent user', () => {
      const retrieved = messaging.getUser('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should get all users', () => {
      const users = messaging.getUsers()
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBeGreaterThan(0)
    })

    it('should set user status', () => {
      const user = messaging.addUser({
        username: 'testuser',
        displayName: 'Test User',
        status: 'online',
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light',
        },
      })

      const result = messaging.setUserStatus(user.id, 'away')
      expect(result).toBe(true)

      const updatedUser = messaging.getUser(user.id)
      expect(updatedUser?.status).toBe('away')
      expect(updatedUser?.lastSeen).toBeDefined()
    })

    it('should return false when setting status for non-existent user', () => {
      const result = messaging.setUserStatus('non-existent', 'away')
      expect(result).toBe(false)
    })
  })

  describe('Conversation Management', () => {
    it('should create a conversation', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      expect(conversation).toBeDefined()
      expect(conversation.id).toBeDefined()
      expect(conversation.name).toBe('Test Chat')
      expect(conversation.type).toBe('direct')
      expect(conversation.participants).toEqual(['user1', 'user2'])
      expect(conversation.createdBy).toBe('user1')
      expect(conversation.createdAt).toBeDefined()
    })

    it('should create a conversation with custom id', () => {
      const conversation = messaging.createConversation({
        id: 'custom-conv-id',
        name: 'Custom Chat',
        type: 'group',
        participants: ['user1', 'user2', 'user3'],
        createdBy: 'user1',
      })

      expect(conversation.id).toBe('custom-conv-id')
    })

    it('should get a conversation by id', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      const retrieved = messaging.getConversation(conversation.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Test Chat')
    })

    it('should return null for non-existent conversation', () => {
      const retrieved = messaging.getConversation('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should get all conversations', () => {
      const conversations = messaging.getConversations()
      expect(Array.isArray(conversations)).toBe(true)
      expect(conversations.length).toBeGreaterThan(0)
    })

    it('should add a participant to conversation', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'group',
        participants: ['user1'],
        createdBy: 'user1',
      })

      const result = messaging.addParticipant(conversation.id, 'user2')
      expect(result).toBe(true)

      const updated = messaging.getConversation(conversation.id)
      expect(updated?.participants).toContain('user2')
    })

    it('should not add duplicate participant', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'group',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      const result = messaging.addParticipant(conversation.id, 'user2')
      expect(result).toBe(false)
    })

    it('should not add participant if max participants reached', () => {
      const messaging = new MessagingSystem({ maxParticipantsPerGroup: 2 })
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'group',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      const result = messaging.addParticipant(conversation.id, 'user3')
      expect(result).toBe(false)
    })

    it('should remove a participant from conversation', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'group',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      const result = messaging.removeParticipant(conversation.id, 'user2')
      expect(result).toBe(true)

      const updated = messaging.getConversation(conversation.id)
      expect(updated?.participants).not.toContain('user2')
    })

    it('should return false when removing non-existent participant', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'group',
        participants: ['user1'],
        createdBy: 'user1',
      })

      const result = messaging.removeParticipant(conversation.id, 'user2')
      expect(result).toBe(false)
    })
  })

  describe('Message Management', () => {
    it('should send a message', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
        threadId: 'conv1',
      })

      expect(message).toBeDefined()
      expect(message.id).toBeDefined()
      expect(message.senderId).toBe('user1')
      expect(message.recipientId).toBe('user2')
      expect(message.content).toBe('Hello!')
      expect(message.type).toBe('text')
      expect(message.status).toBe('sent')
      expect(message.timestamp).toBeDefined()
    })

    it('should send a message with custom id', () => {
      const message = messaging.sendMessage({
        id: 'custom-msg-id',
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      expect(message.id).toBe('custom-msg-id')
    })

    it('should fail to send message that is too long', () => {
      const longContent = 'a'.repeat(1001) // Assuming maxMessageLength is 1000
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: longContent,
        type: 'text',
      })

      expect(message.status).toBe('failed')
    })

    it('should get a message by id', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      const retrieved = messaging.getMessage(message.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.content).toBe('Hello!')
    })

    it('should return null for non-existent message', () => {
      const retrieved = messaging.getMessage('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should get messages for a conversation', () => {
      const messages = messaging.getMessages('conv1')
      expect(Array.isArray(messages)).toBe(true)
      expect(messages.length).toBeGreaterThan(0)
    })

    it('should get all messages when no conversation specified', () => {
      const messages = messaging.getMessages()
      expect(Array.isArray(messages)).toBe(true)
      expect(messages.length).toBeGreaterThan(0)
    })

    it('should limit messages returned', () => {
      const messages = messaging.getMessages(undefined, 2)
      expect(messages.length).toBeLessThanOrEqual(2)
    })

    it('should update message status', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      const result = messaging.updateMessageStatus(message.id, 'delivered')
      expect(result).toBe(true)

      const updated = messaging.getMessage(message.id)
      expect(updated?.status).toBe('delivered')
    })

    it('should return false when updating status for non-existent message', () => {
      const result = messaging.updateMessageStatus('non-existent', 'delivered')
      expect(result).toBe(false)
    })

    it('should edit a message when enabled', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      const edited = messaging.editMessage(message.id, 'Hello, world!')
      expect(edited).toBeDefined()
      expect(edited?.content).toBe('Hello, world!')
      expect(edited?.editedAt).toBeDefined()
    })

    it('should not edit message when disabled', () => {
      const messaging = new MessagingSystem({ enableMessageEditing: false })
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      const edited = messaging.editMessage(message.id, 'Hello, world!')
      expect(edited).toBeNull()
    })

    it('should not edit message that is too long', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      const longContent = 'a'.repeat(1001)
      const edited = messaging.editMessage(message.id, longContent)
      expect(edited).toBeNull()
    })

    it('should delete a message when enabled', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      const result = messaging.deleteMessage(message.id)
      expect(result).toBe(true)

      const deleted = messaging.getMessage(message.id)
      expect(deleted?.deletedAt).toBeDefined()
    })

    it('should not delete message when disabled', () => {
      const messaging = new MessagingSystem({ enableMessageDeletion: false })
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      const result = messaging.deleteMessage(message.id)
      expect(result).toBe(false)
    })

    it('should return false when deleting non-existent message', () => {
      const result = messaging.deleteMessage('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Typing Indicators', () => {
    it('should start typing when enabled', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.startTyping(conversation.id, 'user1')
      const typingUsers = messaging.getTypingUsers(conversation.id)
      expect(typingUsers).toContain('user1')
    })

    it('should not start typing when disabled', () => {
      const messaging = new MessagingSystem({ enableTypingIndicators: false })
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.startTyping(conversation.id, 'user1')
      const typingUsers = messaging.getTypingUsers(conversation.id)
      expect(typingUsers).not.toContain('user1')
    })

    it('should stop typing', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.startTyping(conversation.id, 'user1')
      messaging.stopTyping(conversation.id, 'user1')
      const typingUsers = messaging.getTypingUsers(conversation.id)
      expect(typingUsers).not.toContain('user1')
    })

    it('should get typing users', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.startTyping(conversation.id, 'user1')
      messaging.startTyping(conversation.id, 'user2')
      const typingUsers = messaging.getTypingUsers(conversation.id)
      expect(typingUsers).toContain('user1')
      expect(typingUsers).toContain('user2')
    })
  })

  describe('Read Receipts', () => {
    it('should mark messages as read when enabled', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
        threadId: conversation.id,
      })

      messaging.markAsRead(conversation.id, 'user2')
      const updated = messaging.getMessage(message.id)
      expect(updated?.status).toBe('read')
    })

    it('should not mark messages as read when disabled', () => {
      const messaging = new MessagingSystem({ enableReadReceipts: false })
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
        threadId: conversation.id,
      })

      messaging.markAsRead(conversation.id, 'user2')
      const updated = messaging.getMessage(message.id)
      expect(updated?.status).toBe('sent') // Should remain unchanged
    })
  })

  describe('Search', () => {
    it('should search messages', () => {
      messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello world!',
        type: 'text',
      })

      const results = messaging.searchMessages('world')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].content).toContain('world')
    })

    it('should search messages in specific conversation', () => {
      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello world!',
        type: 'text',
        threadId: conversation.id,
      })

      const results = messaging.searchMessages('world', conversation.id)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].content).toContain('world')
    })

    it('should not return deleted messages in search', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello world!',
        type: 'text',
      })

      messaging.deleteMessage(message.id)
      const results = messaging.searchMessages('world')
      expect(results.length).toBe(0)
    })
  })

  describe('Statistics', () => {
    it('should provide statistics', () => {
      const stats = messaging.getStatistics()

      expect(stats).toBeDefined()
      expect(typeof stats.totalMessages).toBe('number')
      expect(typeof stats.totalUsers).toBe('number')
      expect(typeof stats.totalConversations).toBe('number')
      expect(typeof stats.activeUsers).toBe('number')
      expect(typeof stats.messagesPerDay).toBe('number')
      expect(typeof stats.averageResponseTime).toBe('number')
      expect(Array.isArray(stats.popularEmojis)).toBe(true)
    })

    it('should count active users', () => {
      const stats = messaging.getStatistics()
      expect(stats.activeUsers).toBeGreaterThan(0)
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      messaging.updateConfig({ maxMessageLength: 500 })

      const longMessage = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'a'.repeat(600),
        type: 'text',
      })

      expect(longMessage.status).toBe('failed')
    })
  })

  describe('Cleanup', () => {
    it('should cleanup old messages', () => {
      const messaging = new MessagingSystem({ messageRetentionDays: 0 })

      messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Old message',
        type: 'text',
      })

      const statsBefore = messaging.getStatistics()
      messaging.cleanupOldMessages()
      const statsAfter = messaging.getStatistics()

      expect(statsAfter.totalMessages).toBeLessThanOrEqual(statsBefore.totalMessages)
    })
  })

  describe('Events', () => {
    it('should emit userAdded event', () => {
      const listener = vi.fn()
      messaging.on('userAdded', listener)

      messaging.addUser({
        username: 'testuser',
        displayName: 'Test User',
        status: 'online',
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light',
        },
      })

      expect(listener).toHaveBeenCalledWith({ user: expect.any(Object) })
    })

    it('should emit userUpdated event', () => {
      const listener = vi.fn()
      messaging.on('userUpdated', listener)

      const user = messaging.addUser({
        username: 'testuser',
        displayName: 'Test User',
        status: 'online',
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light',
        },
      })

      messaging.updateUser(user.id, { displayName: 'Updated User' })
      expect(listener).toHaveBeenCalledWith({ user: expect.any(Object) })
    })

    it('should emit userStatusChanged event', () => {
      const listener = vi.fn()
      messaging.on('userStatusChanged', listener)

      const user = messaging.addUser({
        username: 'testuser',
        displayName: 'Test User',
        status: 'online',
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light',
        },
      })

      messaging.setUserStatus(user.id, 'away')
      expect(listener).toHaveBeenCalledWith({ user: expect.any(Object), status: 'away' })
    })

    it('should emit conversationCreated event', () => {
      const listener = vi.fn()
      messaging.on('conversationCreated', listener)

      messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      expect(listener).toHaveBeenCalledWith({ conversation: expect.any(Object) })
    })

    it('should emit participantAdded event', () => {
      const listener = vi.fn()
      messaging.on('participantAdded', listener)

      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'group',
        participants: ['user1'],
        createdBy: 'user1',
      })

      messaging.addParticipant(conversation.id, 'user2')
      expect(listener).toHaveBeenCalledWith({ conversation: expect.any(Object), userId: 'user2' })
    })

    it('should emit participantRemoved event', () => {
      const listener = vi.fn()
      messaging.on('participantRemoved', listener)

      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'group',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.removeParticipant(conversation.id, 'user2')
      expect(listener).toHaveBeenCalledWith({ conversation: expect.any(Object), userId: 'user2' })
    })

    it('should emit messageSent event', () => {
      const listener = vi.fn()
      messaging.on('messageSent', listener)

      messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      expect(listener).toHaveBeenCalledWith({ message: expect.any(Object) })
    })

    it('should emit messageStatusUpdated event', () => {
      const listener = vi.fn()
      messaging.on('messageStatusUpdated', listener)

      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      messaging.updateMessageStatus(message.id, 'delivered')
      expect(listener).toHaveBeenCalledWith({ message: expect.any(Object), status: 'delivered' })
    })

    it('should emit messageEdited event', () => {
      const listener = vi.fn()
      messaging.on('messageEdited', listener)

      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      messaging.editMessage(message.id, 'Hello, world!')
      expect(listener).toHaveBeenCalledWith({ message: expect.any(Object) })
    })

    it('should emit messageDeleted event', () => {
      const listener = vi.fn()
      messaging.on('messageDeleted', listener)

      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
      })

      messaging.deleteMessage(message.id)
      expect(listener).toHaveBeenCalledWith({ message: expect.any(Object) })
    })

    it('should emit typingStarted event', () => {
      const listener = vi.fn()
      messaging.on('typingStarted', listener)

      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.startTyping(conversation.id, 'user1')
      expect(listener).toHaveBeenCalledWith({ conversationId: conversation.id, userId: 'user1' })
    })

    it('should emit typingStopped event', () => {
      const listener = vi.fn()
      messaging.on('typingStopped', listener)

      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.startTyping(conversation.id, 'user1')
      messaging.stopTyping(conversation.id, 'user1')
      expect(listener).toHaveBeenCalledWith({ conversationId: conversation.id, userId: 'user1' })
    })

    it('should emit messagesRead event', () => {
      const listener = vi.fn()
      messaging.on('messagesRead', listener)

      const conversation = messaging.createConversation({
        name: 'Test Chat',
        type: 'direct',
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      })

      messaging.markAsRead(conversation.id, 'user2')
      expect(listener).toHaveBeenCalledWith({ conversationId: conversation.id, userId: 'user2', messageId: undefined })
    })

    it('should emit configUpdated event', () => {
      const listener = vi.fn()
      messaging.on('configUpdated', listener)

      messaging.updateConfig({ maxMessageLength: 500 })
      expect(listener).toHaveBeenCalledWith({ config: expect.any(Object) })
    })

    it('should emit messagesCleanedUp event', () => {
      const listener = vi.fn()
      const messagingInstance = new MessagingSystem({ messageRetentionDays: 0 })
      messagingInstance.on('messagesCleanedUp', listener)

      messagingInstance.cleanupOldMessages()
      expect(listener).toHaveBeenCalledWith({ count: expect.any(Number) })

      messagingInstance.destroy()
    })

    it('should emit destroyed event', () => {
      const listener = vi.fn()
      messaging.on('destroyed', listener)

      messaging.destroy()
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search query', () => {
      const results = messaging.searchMessages('')
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle special characters in messages', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello! 🎉 How are you? 😊',
        type: 'text',
      })

      expect(message).toBeDefined()
      expect(message.content).toBe('Hello! 🎉 How are you? 😊')
    })

    it('should handle very long usernames', () => {
      const user = messaging.addUser({
        username: 'a'.repeat(100),
        displayName: 'Very Long Username',
        status: 'online',
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light',
        },
      })

      expect(user).toBeDefined()
      expect(user.username).toBe('a'.repeat(100))
    })

    it('should handle messages with metadata', () => {
      const message = messaging.sendMessage({
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello!',
        type: 'text',
        metadata: { location: 'New York', weather: 'sunny' },
      })

      expect(message.metadata).toEqual({ location: 'New York', weather: 'sunny' })
    })
  })
})
