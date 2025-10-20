import { EventEmitter } from 'node:events'

export interface Message {
  id: string
  senderId: string
  recipientId: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'file' | 'system'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  metadata?: Record<string, any>
  replyToId?: string
  threadId?: string
  editedAt?: Date
  deletedAt?: Date
}

export interface User {
  id: string
  username: string
  displayName: string
  status: 'online' | 'offline' | 'away' | 'busy'
  lastSeen?: Date
  avatar?: string
  preferences: {
    notifications: boolean
    soundEnabled: boolean
    theme: 'light' | 'dark'
  }
}

export interface Conversation {
  id: string
  name: string
  type: 'direct' | 'group'
  participants: string[]
  createdBy: string
  createdAt: Date
  lastMessageAt?: Date
  lastMessageId?: string
  settings: {
    notifications: boolean
    muteUntil?: Date
    autoDelete?: number // days
  }
}

export interface MessagingConfig {
  maxMessageLength: number
  maxFileSize: number
  messageRetentionDays: number
  maxParticipantsPerGroup: number
  enableTypingIndicators: boolean
  enableReadReceipts: boolean
  enableMessageEditing: boolean
  enableMessageDeletion: boolean
}

export interface MessagingStats {
  totalMessages: number
  totalUsers: number
  totalConversations: number
  activeUsers: number
  messagesPerDay: number
  averageResponseTime: number
  popularEmojis: Array<{ emoji: string; count: number }>
}

export class MessagingSystem extends EventEmitter {
  private messages: Map<string, Message> = new Map()
  private users: Map<string, User> = new Map()
  private conversations: Map<string, Conversation> = new Map()
  private typingUsers: Map<string, Set<string>> = new Map() // conversationId -> Set<userId>
  private config: MessagingConfig
  private startTime: Date

  constructor(config: Partial<MessagingConfig> = {}) {
    super()
    this.config = {
      maxMessageLength: 1000,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      messageRetentionDays: 30,
      maxParticipantsPerGroup: 50,
      enableTypingIndicators: true,
      enableReadReceipts: true,
      enableMessageEditing: true,
      enableMessageDeletion: true,
      ...config,
    }
    this.startTime = new Date()
    this.initializeDefaultData()
  }

  private initializeDefaultData(): void {
    // Add some default users for testing
    const defaultUsers = [
      {
        id: 'user1',
        username: 'alice',
        displayName: 'Alice Johnson',
        status: 'online' as const,
        preferences: {
          notifications: true,
          soundEnabled: true,
          theme: 'light' as const,
        },
      },
      {
        id: 'user2',
        username: 'bob',
        displayName: 'Bob Smith',
        status: 'online' as const,
        preferences: {
          notifications: true,
          soundEnabled: false,
          theme: 'dark' as const,
        },
      },
      {
        id: 'user3',
        username: 'charlie',
        displayName: 'Charlie Brown',
        status: 'away' as const,
        preferences: {
          notifications: false,
          soundEnabled: true,
          theme: 'light' as const,
        },
      },
    ]

    defaultUsers.forEach(user => this.addUser(user))

    // Add some default conversations
    const defaultConversations = [
      {
        id: 'conv1',
        name: 'Alice & Bob',
        type: 'direct' as const,
        participants: ['user1', 'user2'],
        createdBy: 'user1',
      },
      {
        id: 'conv2',
        name: 'Team Chat',
        type: 'group' as const,
        participants: ['user1', 'user2', 'user3'],
        createdBy: 'user1',
      },
    ]

    defaultConversations.forEach(conv => this.createConversation(conv))

    // Add some default messages
    const defaultMessages = [
      {
        id: 'msg1',
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello Bob!',
        type: 'text' as const,
        status: 'read' as const,
        threadId: 'conv1',
      },
      {
        id: 'msg2',
        senderId: 'user2',
        recipientId: 'user1',
        content: 'Hi Alice! How are you?',
        type: 'text' as const,
        status: 'read' as const,
        threadId: 'conv1',
      },
      {
        id: 'msg3',
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Welcome to the team chat!',
        type: 'text' as const,
        status: 'delivered' as const,
        threadId: 'conv2',
      },
    ]

    defaultMessages.forEach(msg => this.sendMessage(msg))
  }

  // User Management
  public addUser(user: Omit<User, 'id'> & { id?: string }): User {
    const id = user.id || this.generateId()
    const newUser: User = {
      id,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      lastSeen: user.lastSeen,
      avatar: user.avatar,
      preferences: user.preferences,
    }

    this.users.set(id, newUser)
    this.emit('userAdded', { user: newUser })
    return newUser
  }

  public updateUser(id: string, updates: Partial<Omit<User, 'id'>>): User | null {
    const user = this.users.get(id)
    if (!user)
      return null

    const updatedUser = { ...user, ...updates }
    this.users.set(id, updatedUser)
    this.emit('userUpdated', { user: updatedUser })
    return updatedUser
  }

  public getUser(id: string): User | null {
    return this.users.get(id) || null
  }

  public getUsers(): User[] {
    return Array.from(this.users.values())
  }

  public setUserStatus(id: string, status: User['status']): boolean {
    const user = this.users.get(id)
    if (!user)
      return false

    user.status = status
    user.lastSeen = new Date()
    this.users.set(id, user)
    this.emit('userStatusChanged', { user, status })
    return true
  }

  // Conversation Management
  public createConversation(conversation: Omit<Conversation, 'id' | 'createdAt' | 'settings'> & { id?: string }): Conversation {
    const id = conversation.id || this.generateId()
    const newConversation: Conversation = {
      id,
      name: conversation.name,
      type: conversation.type,
      participants: conversation.participants,
      createdBy: conversation.createdBy,
      createdAt: new Date(),
      settings: {
        notifications: true,
        muteUntil: undefined,
        autoDelete: undefined,
      },
    }

    this.conversations.set(id, newConversation)
    this.emit('conversationCreated', { conversation: newConversation })
    return newConversation
  }

  public getConversation(id: string): Conversation | null {
    return this.conversations.get(id) || null
  }

  public getConversations(): Conversation[] {
    return Array.from(this.conversations.values())
  }

  public addParticipant(conversationId: string, userId: string): boolean {
    const conversation = this.conversations.get(conversationId)
    if (!conversation)
      return false

    if (conversation.participants.includes(userId))
      return false
    if (conversation.participants.length >= this.config.maxParticipantsPerGroup)
      return false

    conversation.participants.push(userId)
    this.conversations.set(conversationId, conversation)
    this.emit('participantAdded', { conversation, userId })
    return true
  }

  public removeParticipant(conversationId: string, userId: string): boolean {
    const conversation = this.conversations.get(conversationId)
    if (!conversation)
      return false

    const index = conversation.participants.indexOf(userId)
    if (index === -1)
      return false

    conversation.participants.splice(index, 1)
    this.conversations.set(conversationId, conversation)
    this.emit('participantRemoved', { conversation, userId })
    return true
  }

  // Message Management
  public sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'> & { id?: string }): Message {
    const id = message.id || this.generateId()
    const newMessage: Message = {
      id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      timestamp: new Date(),
      type: message.type,
      status: 'sent',
      metadata: message.metadata,
      replyToId: message.replyToId,
      threadId: message.threadId,
      editedAt: undefined,
      deletedAt: undefined,
    }

    // Validate message
    if (newMessage.content.length > this.config.maxMessageLength) {
      newMessage.status = 'failed'
      this.emit('messageFailed', { message: newMessage, reason: 'Message too long' })
      return newMessage
    }

    this.messages.set(id, newMessage)

    // Update conversation last message
    if (newMessage.threadId) {
      const conversation = this.conversations.get(newMessage.threadId)
      if (conversation) {
        conversation.lastMessageAt = newMessage.timestamp
        conversation.lastMessageId = newMessage.id
        this.conversations.set(newMessage.threadId, conversation)
      }
    }

    this.emit('messageSent', { message: newMessage })
    return newMessage
  }

  public getMessage(id: string): Message | null {
    return this.messages.get(id) || null
  }

  public getMessages(conversationId?: string, limit: number = 50): Message[] {
    let messages = Array.from(this.messages.values())

    if (conversationId)
      messages = messages.filter(msg => msg.threadId === conversationId)

    return messages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  public updateMessageStatus(id: string, status: Message['status']): boolean {
    const message = this.messages.get(id)
    if (!message)
      return false

    message.status = status
    this.messages.set(id, message)
    this.emit('messageStatusUpdated', { message, status })
    return true
  }

  public editMessage(id: string, content: string): Message | null {
    if (!this.config.enableMessageEditing)
      return null

    const message = this.messages.get(id)
    if (!message)
      return null

    if (content.length > this.config.maxMessageLength)
      return null

    message.content = content
    message.editedAt = new Date()
    this.messages.set(id, message)
    this.emit('messageEdited', { message })
    return message
  }

  public deleteMessage(id: string): boolean {
    if (!this.config.enableMessageDeletion)
      return false

    const message = this.messages.get(id)
    if (!message)
      return false

    message.deletedAt = new Date()
    this.messages.set(id, message)
    this.emit('messageDeleted', { message })
    return true
  }

  // Typing Indicators
  public startTyping(conversationId: string, userId: string): void {
    if (!this.config.enableTypingIndicators)
      return

    if (!this.typingUsers.has(conversationId))
      this.typingUsers.set(conversationId, new Set())

    this.typingUsers.get(conversationId)!.add(userId)
    this.emit('typingStarted', { conversationId, userId })
  }

  public stopTyping(conversationId: string, userId: string): void {
    if (!this.config.enableTypingIndicators)
      return

    const typingSet = this.typingUsers.get(conversationId)
    if (typingSet) {
      typingSet.delete(userId)
      this.emit('typingStopped', { conversationId, userId })
    }
  }

  public getTypingUsers(conversationId: string): string[] {
    return Array.from(this.typingUsers.get(conversationId) || [])
  }

  // Read Receipts
  public markAsRead(conversationId: string, userId: string, messageId?: string): void {
    if (!this.config.enableReadReceipts)
      return

    const messages = this.getMessages(conversationId)
    const messagesToUpdate = messageId
      ? messages.filter(msg => msg.id === messageId)
      : messages.filter(msg => msg.recipientId === userId && msg.status !== 'read')

    messagesToUpdate.forEach((msg) => {
      this.updateMessageStatus(msg.id, 'read')
    })

    this.emit('messagesRead', { conversationId, userId, messageId })
  }

  // Search
  public searchMessages(query: string, conversationId?: string): Message[] {
    let messages = Array.from(this.messages.values())

    if (conversationId)
      messages = messages.filter(msg => msg.threadId === conversationId)

    return messages
      .filter(msg =>
        msg.content.toLowerCase().includes(query.toLowerCase())
        && !msg.deletedAt,
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Statistics
  public getStatistics(): MessagingStats {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentMessages = Array.from(this.messages.values())
      .filter(msg => msg.timestamp >= oneDayAgo)

    const activeUsers = Array.from(this.users.values())
      .filter(user => user.status === 'online').length

    // Count emojis (simple implementation)
    const emojiCounts = new Map<string, number>()
    Array.from(this.messages.values()).forEach((msg) => {
      const emojiMatches = msg.content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu)
      if (emojiMatches) {
        emojiMatches.forEach((emoji) => {
          emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1)
        })
      }
    })

    const popularEmojis = Array.from(emojiCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([emoji, count]) => ({ emoji, count }))

    return {
      totalMessages: this.messages.size,
      totalUsers: this.users.size,
      totalConversations: this.conversations.size,
      activeUsers,
      messagesPerDay: recentMessages.length,
      averageResponseTime: 0, // Would need to track this separately
      popularEmojis,
    }
  }

  // Configuration
  public updateConfig(newConfig: Partial<MessagingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('configUpdated', { config: this.config })
  }

  // Cleanup
  public cleanupOldMessages(): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.messageRetentionDays)

    const oldMessages = Array.from(this.messages.values())
      .filter(msg => msg.timestamp < cutoffDate)

    oldMessages.forEach((msg) => {
      this.messages.delete(msg.id)
    })

    this.emit('messagesCleanedUp', { count: oldMessages.length })
  }

  public destroy(): void {
    this.messages.clear()
    this.users.clear()
    this.conversations.clear()
    this.typingUsers.clear()
    this.emit('destroyed')
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}
