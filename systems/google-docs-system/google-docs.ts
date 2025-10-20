import { EventEmitter } from 'node:events'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
}

export interface Document {
  id: string
  title: string
  content: string
  ownerId: string
  collaborators: string[]
  permissions: DocumentPermissions
  createdAt: Date
  updatedAt: Date
  version: number
  isPublic: boolean
  tags: string[]
}

export interface DocumentPermissions {
  canView: string[]
  canEdit: string[]
  canComment: string[]
  canShare: string[]
}

export interface Comment {
  id: string
  documentId: string
  authorId: string
  content: string
  position: TextPosition
  resolved: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TextPosition {
  start: number
  end: number
  line: number
  column: number
}

export interface Revision {
  id: string
  documentId: string
  authorId: string
  content: string
  changes: Change[]
  createdAt: Date
  message?: string
}

export interface Change {
  type: 'insert' | 'delete' | 'format'
  position: TextPosition
  content?: string
  format?: TextFormat
}

export interface TextFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  fontSize?: number
  fontFamily?: string
  color?: string
  backgroundColor?: string
}

export interface ShareLink {
  id: string
  documentId: string
  url: string
  permissions: DocumentPermissions
  expiresAt?: Date
  createdAt: Date
  accessCount: number
}

export interface GoogleDocsOptions {
  maxDocumentSize?: number
  maxCollaborators?: number
  autoSaveInterval?: number
  maxRevisions?: number
}

export class GoogleDocsSystem extends EventEmitter {
  private users: Map<string, User> = new Map()
  private documents: Map<string, Document> = new Map()
  private comments: Map<string, Comment> = new Map()
  private revisions: Map<string, Revision[]> = new Map()
  private shareLinks: Map<string, ShareLink> = new Map()
  private documentComments: Map<string, string[]> = new Map()
  private documentRevisions: Map<string, string[]> = new Map()
  private userDocuments: Map<string, string[]> = new Map()

  private maxDocumentSize: number
  private maxCollaborators: number
  private autoSaveInterval: number
  private maxRevisions: number

  constructor(options: GoogleDocsOptions = {}) {
    super()
    this.maxDocumentSize = options.maxDocumentSize || 1000000 // 1MB
    this.maxCollaborators = options.maxCollaborators || 50
    this.autoSaveInterval = options.autoSaveInterval || 30000 // 30 seconds
    this.maxRevisions = options.maxRevisions || 100
    this.initializeDefaultData()
  }

  private initializeDefaultData(): void {
    // Create some default users
    this.createUser({
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
    })

    this.createUser({
      id: 'user2',
      email: 'jane@example.com',
      name: 'Jane Smith',
    })

    this.createUser({
      id: 'user3',
      email: 'bob@example.com',
      name: 'Bob Wilson',
    })

    // Create some default documents
    this.createDocument({
      id: 'doc1',
      title: 'Project Proposal',
      content: 'This is a comprehensive project proposal for our new initiative.',
      ownerId: 'user1',
      collaborators: ['user2'],
      permissions: {
        canView: ['user1', 'user2'],
        canEdit: ['user1', 'user2'],
        canComment: ['user1', 'user2', 'user3'],
        canShare: ['user1'],
      },
      isPublic: false,
      tags: ['project', 'proposal', 'business'],
    })

    this.createDocument({
      id: 'doc2',
      title: 'Meeting Notes',
      content: 'Notes from our weekly team meeting.',
      ownerId: 'user2',
      collaborators: ['user1'],
      permissions: {
        canView: ['user1', 'user2'],
        canEdit: ['user1', 'user2'],
        canComment: ['user1', 'user2'],
        canShare: ['user2'],
      },
      isPublic: false,
      tags: ['meeting', 'notes', 'team'],
    })
  }

  // User Management
  public createUser(userData: Omit<User, 'createdAt'>): User {
    const user: User = {
      ...userData,
      createdAt: new Date(),
    }

    this.users.set(user.id, user)
    this.userDocuments.set(user.id, [])

    this.emit('userCreated', user)
    return user
  }

  public getUser(userId: string): User | undefined {
    return this.users.get(userId)
  }

  public updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | null {
    const user = this.users.get(userId)
    if (!user)
      return null

    const updatedUser: User = {
      ...user,
      ...updates,
    }

    this.users.set(userId, updatedUser)
    this.emit('userUpdated', updatedUser)
    return updatedUser
  }

  public deleteUser(userId: string): boolean {
    if (!this.users.has(userId))
      return false

    // Remove user from all documents
    this.documents.forEach((doc) => {
      if (doc.ownerId === userId) {
        this.deleteDocument(doc.id)
      }
      else {
        // Remove from collaborators
        const index = doc.collaborators.indexOf(userId)
        if (index > -1) {
          doc.collaborators.splice(index, 1)
          this.documents.set(doc.id, doc)
        }
      }
    })

    this.users.delete(userId)
    this.userDocuments.delete(userId)

    this.emit('userDeleted', { userId })
    return true
  }

  // Document Management
  public createDocument(docData: Omit<Document, 'createdAt' | 'updatedAt' | 'version'>): Document {
    const now = new Date()
    const document: Document = {
      ...docData,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }

    this.documents.set(document.id, document)
    this.userDocuments.get(document.ownerId)?.push(document.id)
    this.documentComments.set(document.id, [])
    this.documentRevisions.set(document.id, [])

    this.emit('documentCreated', document)
    return document
  }

  public getDocument(docId: string): Document | undefined {
    return this.documents.get(docId)
  }

  public updateDocument(docId: string, updates: Partial<Omit<Document, 'id' | 'ownerId' | 'createdAt' | 'version'>>): Document | null {
    const document = this.documents.get(docId)
    if (!document)
      return null

    const updatedDocument: Document = {
      ...document,
      ...updates,
      updatedAt: new Date(),
      version: document.version + 1,
    }

    this.documents.set(docId, updatedDocument)

    // Create revision without incrementing version (already incremented above)
    this.createRevisionInternal(docId, document.content, updatedDocument.content, document.ownerId)

    this.emit('documentUpdated', updatedDocument)
    return updatedDocument
  }

  public deleteDocument(docId: string): boolean {
    const document = this.documents.get(docId)
    if (!document)
      return false

    // Remove from owner's documents
    const ownerDocs = this.userDocuments.get(document.ownerId) || []
    const index = ownerDocs.indexOf(docId)
    if (index > -1)
      ownerDocs.splice(index, 1)

    // Delete associated comments and revisions
    const commentIds = this.documentComments.get(docId) || []
    commentIds.forEach(commentId => this.comments.delete(commentId))

    const revisionIds = this.documentRevisions.get(docId) || []
    revisionIds.forEach((revisionId) => {
      const revisions = this.revisions.get(docId) || []
      const revIndex = revisions.findIndex(r => r.id === revisionId)
      if (revIndex > -1) {
        revisions.splice(revIndex, 1)
        this.revisions.set(docId, revisions)
      }
    })

    // Clean up data structures
    this.documents.delete(docId)
    this.documentComments.delete(docId)
    this.documentRevisions.delete(docId)
    this.revisions.delete(docId)

    this.emit('documentDeleted', { docId })
    return true
  }

  // Comment Management
  public createComment(commentData: Omit<Comment, 'createdAt' | 'updatedAt' | 'resolved'>): Comment {
    const now = new Date()
    const comment: Comment = {
      ...commentData,
      createdAt: now,
      updatedAt: now,
      resolved: false,
    }

    this.comments.set(comment.id, comment)
    this.documentComments.get(comment.documentId)?.push(comment.id)

    this.emit('commentCreated', comment)
    return comment
  }

  public getComment(commentId: string): Comment | undefined {
    return this.comments.get(commentId)
  }

  public updateComment(commentId: string, updates: Partial<Omit<Comment, 'id' | 'documentId' | 'authorId' | 'createdAt'>>): Comment | null {
    const comment = this.comments.get(commentId)
    if (!comment)
      return null

    const updatedComment: Comment = {
      ...comment,
      ...updates,
      updatedAt: new Date(),
    }

    this.comments.set(commentId, updatedComment)
    this.emit('commentUpdated', updatedComment)
    return updatedComment
  }

  public deleteComment(commentId: string): boolean {
    const comment = this.comments.get(commentId)
    if (!comment)
      return false

    // Remove from document's comments
    const docComments = this.documentComments.get(comment.documentId) || []
    const index = docComments.indexOf(commentId)
    if (index > -1)
      docComments.splice(index, 1)

    this.comments.delete(commentId)
    this.emit('commentDeleted', { commentId })
    return true
  }

  public resolveComment(commentId: string): boolean {
    const comment = this.comments.get(commentId)
    if (!comment)
      return false

    comment.resolved = true
    comment.updatedAt = new Date()
    this.comments.set(commentId, comment)

    this.emit('commentResolved', { commentId })
    return true
  }

  // Revision Management
  public createRevision(docId: string, oldContent: string, newContent: string, authorId: string, message?: string): Revision | null {
    const document = this.documents.get(docId)
    if (!document)
      return null

    const changes = this.calculateChanges(oldContent, newContent)
    const revision: Revision = {
      id: `${docId}-${Date.now()}`,
      documentId: docId,
      authorId,
      content: newContent,
      changes,
      createdAt: new Date(),
      message,
    }

    const revisions = this.revisions.get(docId) || []
    revisions.push(revision)

    // Limit number of revisions
    if (revisions.length > this.maxRevisions)
      revisions.shift()

    this.revisions.set(docId, revisions)
    this.documentRevisions.get(docId)?.push(revision.id)

    // Update document version and content
    document.content = newContent
    document.version++
    document.updatedAt = new Date()
    this.documents.set(docId, document)

    this.emit('revisionCreated', revision)
    return revision
  }

  private createRevisionInternal(docId: string, oldContent: string, newContent: string, authorId: string, message?: string): Revision | null {
    const document = this.documents.get(docId)
    if (!document)
      return null

    const changes = this.calculateChanges(oldContent, newContent)
    const revision: Revision = {
      id: `${docId}-${Date.now()}`,
      documentId: docId,
      authorId,
      content: newContent,
      changes,
      createdAt: new Date(),
      message,
    }

    const revisions = this.revisions.get(docId) || []
    revisions.push(revision)

    // Limit number of revisions
    if (revisions.length > this.maxRevisions)
      revisions.shift()

    this.revisions.set(docId, revisions)
    this.documentRevisions.get(docId)?.push(revision.id)

    this.emit('revisionCreated', revision)
    return revision
  }

  public getRevisions(docId: string): Revision[] {
    return this.revisions.get(docId) || []
  }

  public restoreRevision(docId: string, revisionId: string): boolean {
    const revisions = this.revisions.get(docId)
    if (!revisions)
      return false

    const revision = revisions.find(r => r.id === revisionId)
    if (!revision)
      return false

    const document = this.documents.get(docId)
    if (!document)
      return false

    document.content = revision.content
    document.updatedAt = new Date()
    document.version++

    this.documents.set(docId, document)
    this.emit('revisionRestored', { docId, revisionId })
    return true
  }

  // Share Management
  public createShareLink(docId: string, permissions: DocumentPermissions, expiresAt?: Date): ShareLink | null {
    const document = this.documents.get(docId)
    if (!document)
      return null

    const shareLink: ShareLink = {
      id: `share-${Date.now()}`,
      documentId: docId,
      url: `https://docs.example.com/share/${docId}`,
      permissions,
      expiresAt,
      createdAt: new Date(),
      accessCount: 0,
    }

    this.shareLinks.set(shareLink.id, shareLink)
    this.emit('shareLinkCreated', shareLink)
    return shareLink
  }

  public getShareLink(linkId: string): ShareLink | undefined {
    return this.shareLinks.get(linkId)
  }

  public accessShareLink(linkId: string): boolean {
    const shareLink = this.shareLinks.get(linkId)
    if (!shareLink)
      return false

    if (shareLink.expiresAt && shareLink.expiresAt < new Date())
      return false

    shareLink.accessCount++
    this.shareLinks.set(linkId, shareLink)
    this.emit('shareLinkAccessed', { linkId })
    return true
  }

  public deleteShareLink(linkId: string): boolean {
    const shareLink = this.shareLinks.get(linkId)
    if (!shareLink)
      return false

    this.shareLinks.delete(linkId)
    this.emit('shareLinkDeleted', { linkId })
    return true
  }

  // Collaboration
  public addCollaborator(docId: string, userId: string, permissions: Partial<DocumentPermissions>): boolean {
    const document = this.documents.get(docId)
    if (!document)
      return false

    if (document.collaborators.length >= this.maxCollaborators)
      return false

    if (!document.collaborators.includes(userId))
      document.collaborators.push(userId)

    // Update permissions
    if (permissions.canView)
      document.permissions.canView = [...new Set([...document.permissions.canView, ...permissions.canView])]

    if (permissions.canEdit)
      document.permissions.canEdit = [...new Set([...document.permissions.canEdit, ...permissions.canEdit])]

    if (permissions.canComment)
      document.permissions.canComment = [...new Set([...document.permissions.canComment, ...permissions.canComment])]

    if (permissions.canShare)
      document.permissions.canShare = [...new Set([...document.permissions.canShare, ...permissions.canShare])]

    this.documents.set(docId, document)
    this.emit('collaboratorAdded', { docId, userId, permissions })
    return true
  }

  public removeCollaborator(docId: string, userId: string): boolean {
    const document = this.documents.get(docId)
    if (!document)
      return false

    const index = document.collaborators.indexOf(userId)
    if (index === -1)
      return false

    document.collaborators.splice(index, 1)

    // Remove from permissions
    document.permissions.canView = document.permissions.canView.filter(id => id !== userId)
    document.permissions.canEdit = document.permissions.canEdit.filter(id => id !== userId)
    document.permissions.canComment = document.permissions.canComment.filter(id => id !== userId)
    document.permissions.canShare = document.permissions.canShare.filter(id => id !== userId)

    this.documents.set(docId, document)
    this.emit('collaboratorRemoved', { docId, userId })
    return true
  }

  // Search and Discovery
  public searchDocuments(query: string, userId?: string): Document[] {
    const allDocs = Array.from(this.documents.values())
    let filteredDocs = allDocs

    if (userId) {
      filteredDocs = allDocs.filter(doc =>
        doc.ownerId === userId
        || doc.collaborators.includes(userId)
        || doc.permissions.canView.includes(userId),
      )
    }

    return filteredDocs.filter(doc =>
      doc.title.toLowerCase().includes(query.toLowerCase())
      || doc.content.toLowerCase().includes(query.toLowerCase())
      || doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())),
    )
  }

  public getDocumentComments(docId: string): Comment[] {
    const commentIds = this.documentComments.get(docId) || []
    return commentIds.map(id => this.comments.get(id)).filter(Boolean) as Comment[]
  }

  public getUserDocuments(userId: string): Document[] {
    const docIds = this.userDocuments.get(userId) || []
    return docIds.map(id => this.documents.get(id)).filter(Boolean) as Document[]
  }

  // Statistics
  public getStatistics(): {
    totalUsers: number
    totalDocuments: number
    totalComments: number
    totalRevisions: number
    totalShareLinks: number
    averageDocumentsPerUser: number
    averageCommentsPerDocument: number
    averageRevisionsPerDocument: number
  } {
    const totalUsers = this.users.size
    const totalDocuments = this.documents.size
    const totalComments = this.comments.size
    const totalRevisions = Array.from(this.revisions.values()).reduce((sum, revs) => sum + revs.length, 0)
    const totalShareLinks = this.shareLinks.size

    return {
      totalUsers,
      totalDocuments,
      totalComments,
      totalRevisions,
      totalShareLinks,
      averageDocumentsPerUser: totalUsers > 0 ? totalDocuments / totalUsers : 0,
      averageCommentsPerDocument: totalDocuments > 0 ? totalComments / totalDocuments : 0,
      averageRevisionsPerDocument: totalDocuments > 0 ? totalRevisions / totalDocuments : 0,
    }
  }

  // Helper Methods
  private calculateChanges(oldContent: string, newContent: string): Change[] {
    // Simple diff algorithm - in a real implementation, you'd use a more sophisticated diff
    const changes: Change[] = []

    if (oldContent !== newContent) {
      changes.push({
        type: 'insert',
        position: { start: 0, end: newContent.length, line: 0, column: 0 },
        content: newContent,
      })
    }

    return changes
  }

  public formatText(content: string, format: TextFormat): string {
    // Simple text formatting - in a real implementation, you'd use a rich text editor
    let formatted = content

    if (format.bold)
      formatted = `**${formatted}**`

    if (format.italic)
      formatted = `*${formatted}*`

    if (format.underline)
      formatted = `__${formatted}__`

    if (format.strikethrough)
      formatted = `~~${formatted}~~`

    return formatted
  }
}
