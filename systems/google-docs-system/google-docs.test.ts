import { beforeEach, describe, expect, it } from 'vitest'
import type { TextFormat } from './google-docs'
import { GoogleDocsSystem } from './google-docs'

describe('Google Docs System', () => {
  let googleDocs: GoogleDocsSystem

  beforeEach(() => {
    googleDocs = new GoogleDocsSystem()
  })

  describe('User Management', () => {
    it('should create a user', () => {
      const userData = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      }

      const user = googleDocs.createUser(userData)

      expect(user.id).toBe('test-user')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.createdAt).toBeInstanceOf(Date)
    })

    it('should get a user by ID', () => {
      const user = googleDocs.getUser('user1')
      expect(user).toBeDefined()
      expect(user?.name).toBe('John Doe')
    })

    it('should return undefined for non-existent user', () => {
      const user = googleDocs.getUser('non-existent')
      expect(user).toBeUndefined()
    })

    it('should update a user', () => {
      const updates = {
        name: 'Updated Name',
        email: 'updated@example.com',
      }

      const updatedUser = googleDocs.updateUser('user1', updates)
      expect(updatedUser).toBeDefined()
      expect(updatedUser?.name).toBe('Updated Name')
      expect(updatedUser?.email).toBe('updated@example.com')
    })

    it('should return null when updating non-existent user', () => {
      const updates = { name: 'New Name' }
      const result = googleDocs.updateUser('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a user', () => {
      const result = googleDocs.deleteUser('user1')
      expect(result).toBe(true)
      expect(googleDocs.getUser('user1')).toBeUndefined()
    })

    it('should return false when deleting non-existent user', () => {
      const result = googleDocs.deleteUser('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Document Management', () => {
    it('should create a document', () => {
      const docData = {
        id: 'test-doc',
        title: 'Test Document',
        content: 'This is a test document.',
        ownerId: 'user1',
        collaborators: ['user2'],
        permissions: {
          canView: ['user1', 'user2'],
          canEdit: ['user1', 'user2'],
          canComment: ['user1', 'user2'],
          canShare: ['user1'],
        },
        isPublic: false,
        tags: ['test', 'document'],
      }

      const document = googleDocs.createDocument(docData)

      expect(document.id).toBe('test-doc')
      expect(document.title).toBe('Test Document')
      expect(document.content).toBe('This is a test document.')
      expect(document.ownerId).toBe('user1')
      expect(document.collaborators).toEqual(['user2'])
      expect(document.version).toBe(1)
      expect(document.createdAt).toBeInstanceOf(Date)
      expect(document.updatedAt).toBeInstanceOf(Date)
    })

    it('should get a document by ID', () => {
      const document = googleDocs.getDocument('doc1')
      expect(document).toBeDefined()
      expect(document?.title).toBe('Project Proposal')
    })

    it('should return undefined for non-existent document', () => {
      const document = googleDocs.getDocument('non-existent')
      expect(document).toBeUndefined()
    })

    it('should update a document', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
      }

      // Add a small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updatedDocument = googleDocs.updateDocument('doc1', updates)
      expect(updatedDocument).toBeDefined()
      expect(updatedDocument?.title).toBe('Updated Title')
      expect(updatedDocument?.content).toBe('Updated content')
      expect(updatedDocument?.version).toBe(2)
      expect(updatedDocument?.updatedAt.getTime()).toBeGreaterThan(updatedDocument?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent document', () => {
      const updates = { title: 'New Title' }
      const result = googleDocs.updateDocument('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a document', () => {
      const result = googleDocs.deleteDocument('doc1')
      expect(result).toBe(true)
      expect(googleDocs.getDocument('doc1')).toBeUndefined()
    })

    it('should return false when deleting non-existent document', () => {
      const result = googleDocs.deleteDocument('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Comment Management', () => {
    it('should create a comment', () => {
      const commentData = {
        id: 'test-comment',
        documentId: 'doc1',
        authorId: 'user2',
        content: 'Great work!',
        position: {
          start: 0,
          end: 10,
          line: 0,
          column: 0,
        },
      }

      const comment = googleDocs.createComment(commentData)

      expect(comment.id).toBe('test-comment')
      expect(comment.documentId).toBe('doc1')
      expect(comment.authorId).toBe('user2')
      expect(comment.content).toBe('Great work!')
      expect(comment.resolved).toBe(false)
      expect(comment.createdAt).toBeInstanceOf(Date)
      expect(comment.updatedAt).toBeInstanceOf(Date)
    })

    it('should get a comment by ID', () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-2',
        documentId: 'doc1',
        authorId: 'user2',
        content: 'Test comment',
        position: { start: 0, end: 10, line: 0, column: 0 },
      }
      googleDocs.createComment(commentData)

      const comment = googleDocs.getComment('test-comment-2')
      expect(comment).toBeDefined()
      expect(comment?.content).toBe('Test comment')
    })

    it('should return undefined for non-existent comment', () => {
      const comment = googleDocs.getComment('non-existent')
      expect(comment).toBeUndefined()
    })

    it('should update a comment', async () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-3',
        documentId: 'doc1',
        authorId: 'user2',
        content: 'Original comment',
        position: { start: 0, end: 10, line: 0, column: 0 },
      }
      googleDocs.createComment(commentData)

      const updates = {
        content: 'Updated comment',
      }

      // Add a small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updatedComment = googleDocs.updateComment('test-comment-3', updates)
      expect(updatedComment).toBeDefined()
      expect(updatedComment?.content).toBe('Updated comment')
      expect(updatedComment?.updatedAt.getTime()).toBeGreaterThan(updatedComment?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent comment', () => {
      const updates = { content: 'New content' }
      const result = googleDocs.updateComment('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a comment', () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-4',
        documentId: 'doc1',
        authorId: 'user2',
        content: 'Comment to delete',
        position: { start: 0, end: 10, line: 0, column: 0 },
      }
      googleDocs.createComment(commentData)

      const result = googleDocs.deleteComment('test-comment-4')
      expect(result).toBe(true)
      expect(googleDocs.getComment('test-comment-4')).toBeUndefined()
    })

    it('should return false when deleting non-existent comment', () => {
      const result = googleDocs.deleteComment('non-existent')
      expect(result).toBe(false)
    })

    it('should resolve a comment', () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-5',
        documentId: 'doc1',
        authorId: 'user2',
        content: 'Comment to resolve',
        position: { start: 0, end: 10, line: 0, column: 0 },
      }
      googleDocs.createComment(commentData)

      const result = googleDocs.resolveComment('test-comment-5')
      expect(result).toBe(true)

      const comment = googleDocs.getComment('test-comment-5')
      expect(comment?.resolved).toBe(true)
    })

    it('should return false when resolving non-existent comment', () => {
      const result = googleDocs.resolveComment('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Revision Management', () => {
    it('should create a revision', () => {
      const revision = googleDocs.createRevision('doc1', 'Old content', 'New content', 'user1', 'Updated content')
      expect(revision).toBeDefined()
      expect(revision?.documentId).toBe('doc1')
      expect(revision?.authorId).toBe('user1')
      expect(revision?.content).toBe('New content')
      expect(revision?.message).toBe('Updated content')
      expect(revision?.createdAt).toBeInstanceOf(Date)
    })

    it('should return null when creating revision for non-existent document', () => {
      const revision = googleDocs.createRevision('non-existent', 'Old', 'New', 'user1')
      expect(revision).toBeNull()
    })

    it('should get revisions for a document', () => {
      googleDocs.createRevision('doc1', 'Old content', 'New content', 'user1')
      const revisions = googleDocs.getRevisions('doc1')
      expect(Array.isArray(revisions)).toBe(true)
      expect(revisions.length).toBeGreaterThan(0)
    })

    it('should restore a revision', () => {
      const revision = googleDocs.createRevision('doc1', 'Old content', 'New content', 'user1')
      expect(revision).toBeDefined()

      const result = googleDocs.restoreRevision('doc1', revision!.id)
      expect(result).toBe(true)

      const document = googleDocs.getDocument('doc1')
      expect(document?.content).toBe('New content')
    })

    it('should return false when restoring non-existent revision', () => {
      const result = googleDocs.restoreRevision('doc1', 'non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Share Management', () => {
    it('should create a share link', () => {
      const permissions = {
        canView: ['user1', 'user2'],
        canEdit: ['user1'],
        canComment: ['user1', 'user2'],
        canShare: ['user1'],
      }

      const shareLink = googleDocs.createShareLink('doc1', permissions)
      expect(shareLink).toBeDefined()
      expect(shareLink?.documentId).toBe('doc1')
      expect(shareLink?.permissions).toEqual(permissions)
      expect(shareLink?.url).toContain('docs.example.com')
      expect(shareLink?.createdAt).toBeInstanceOf(Date)
      expect(shareLink?.accessCount).toBe(0)
    })

    it('should return null when creating share link for non-existent document', () => {
      const permissions = { canView: ['user1'], canEdit: [], canComment: [], canShare: [] }
      const shareLink = googleDocs.createShareLink('non-existent', permissions)
      expect(shareLink).toBeNull()
    })

    it('should get a share link by ID', () => {
      const permissions = { canView: ['user1'], canEdit: [], canComment: [], canShare: [] }
      const shareLink = googleDocs.createShareLink('doc1', permissions)
      expect(shareLink).toBeDefined()

      const retrieved = googleDocs.getShareLink(shareLink!.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.documentId).toBe('doc1')
    })

    it('should return undefined for non-existent share link', () => {
      const shareLink = googleDocs.getShareLink('non-existent')
      expect(shareLink).toBeUndefined()
    })

    it('should access a share link', () => {
      const permissions = { canView: ['user1'], canEdit: [], canComment: [], canShare: [] }
      const shareLink = googleDocs.createShareLink('doc1', permissions)
      expect(shareLink).toBeDefined()

      const result = googleDocs.accessShareLink(shareLink!.id)
      expect(result).toBe(true)

      const updated = googleDocs.getShareLink(shareLink!.id)
      expect(updated?.accessCount).toBe(1)
    })

    it('should return false when accessing non-existent share link', () => {
      const result = googleDocs.accessShareLink('non-existent')
      expect(result).toBe(false)
    })

    it('should delete a share link', () => {
      const permissions = { canView: ['user1'], canEdit: [], canComment: [], canShare: [] }
      const shareLink = googleDocs.createShareLink('doc1', permissions)
      expect(shareLink).toBeDefined()

      const result = googleDocs.deleteShareLink(shareLink!.id)
      expect(result).toBe(true)
      expect(googleDocs.getShareLink(shareLink!.id)).toBeUndefined()
    })

    it('should return false when deleting non-existent share link', () => {
      const result = googleDocs.deleteShareLink('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Collaboration', () => {
    it('should add a collaborator', () => {
      const permissions = {
        canView: ['user3'],
        canEdit: ['user3'],
        canComment: ['user3'],
        canShare: [],
      }

      const result = googleDocs.addCollaborator('doc1', 'user3', permissions)
      expect(result).toBe(true)

      const document = googleDocs.getDocument('doc1')
      expect(document?.collaborators).toContain('user3')
      expect(document?.permissions.canView).toContain('user3')
      expect(document?.permissions.canEdit).toContain('user3')
      expect(document?.permissions.canComment).toContain('user3')
    })

    it('should return false when adding collaborator to non-existent document', () => {
      const permissions = { canView: ['user3'], canEdit: [], canComment: [], canShare: [] }
      const result = googleDocs.addCollaborator('non-existent', 'user3', permissions)
      expect(result).toBe(false)
    })

    it('should remove a collaborator', () => {
      // First add a collaborator
      googleDocs.addCollaborator('doc1', 'user3', {
        canView: ['user3'],
        canEdit: ['user3'],
        canComment: ['user3'],
        canShare: [],
      })

      const result = googleDocs.removeCollaborator('doc1', 'user3')
      expect(result).toBe(true)

      const document = googleDocs.getDocument('doc1')
      expect(document?.collaborators).not.toContain('user3')
      expect(document?.permissions.canView).not.toContain('user3')
      expect(document?.permissions.canEdit).not.toContain('user3')
      expect(document?.permissions.canComment).not.toContain('user3')
    })

    it('should return false when removing non-existent collaborator', () => {
      const result = googleDocs.removeCollaborator('doc1', 'non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Search and Discovery', () => {
    it('should search documents by title', () => {
      const results = googleDocs.searchDocuments('Project')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(doc => doc.title.includes('Project'))).toBe(true)
    })

    it('should search documents by content', () => {
      const results = googleDocs.searchDocuments('comprehensive')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(doc => doc.content.includes('comprehensive'))).toBe(true)
    })

    it('should search documents by tags', () => {
      const results = googleDocs.searchDocuments('project')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(doc => doc.tags.includes('project'))).toBe(true)
    })

    it('should search documents for specific user', () => {
      const results = googleDocs.searchDocuments('Project', 'user1')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(doc =>
        doc.ownerId === 'user1'
        || doc.collaborators.includes('user1')
        || doc.permissions.canView.includes('user1'),
      )).toBe(true)
    })

    it('should get document comments', () => {
      // Create a comment first
      googleDocs.createComment({
        id: 'comment1',
        documentId: 'doc1',
        authorId: 'user2',
        content: 'Test comment',
        position: { start: 0, end: 10, line: 0, column: 0 },
      })

      const comments = googleDocs.getDocumentComments('doc1')
      expect(Array.isArray(comments)).toBe(true)
      expect(comments.length).toBeGreaterThan(0)
    })

    it('should get user documents', () => {
      const documents = googleDocs.getUserDocuments('user1')
      expect(Array.isArray(documents)).toBe(true)
      expect(documents.length).toBeGreaterThan(0)
      expect(documents.every(doc => doc.ownerId === 'user1')).toBe(true)
    })
  })

  describe('Statistics', () => {
    it('should get system statistics', () => {
      const stats = googleDocs.getStatistics()

      expect(stats).toHaveProperty('totalUsers')
      expect(stats).toHaveProperty('totalDocuments')
      expect(stats).toHaveProperty('totalComments')
      expect(stats).toHaveProperty('totalRevisions')
      expect(stats).toHaveProperty('totalShareLinks')
      expect(stats).toHaveProperty('averageDocumentsPerUser')
      expect(stats).toHaveProperty('averageCommentsPerDocument')
      expect(stats).toHaveProperty('averageRevisionsPerDocument')

      expect(typeof stats.totalUsers).toBe('number')
      expect(typeof stats.totalDocuments).toBe('number')
      expect(typeof stats.totalComments).toBe('number')
      expect(typeof stats.totalRevisions).toBe('number')
      expect(typeof stats.totalShareLinks).toBe('number')
    })
  })

  describe('Text Formatting', () => {
    it('should format text with bold', () => {
      const format: TextFormat = { bold: true }
      const result = googleDocs.formatText('Hello', format)
      expect(result).toBe('**Hello**')
    })

    it('should format text with italic', () => {
      const format: TextFormat = { italic: true }
      const result = googleDocs.formatText('Hello', format)
      expect(result).toBe('*Hello*')
    })

    it('should format text with underline', () => {
      const format: TextFormat = { underline: true }
      const result = googleDocs.formatText('Hello', format)
      expect(result).toBe('__Hello__')
    })

    it('should format text with strikethrough', () => {
      const format: TextFormat = { strikethrough: true }
      const result = googleDocs.formatText('Hello', format)
      expect(result).toBe('~~Hello~~')
    })

    it('should format text with multiple styles', () => {
      const format: TextFormat = { bold: true, italic: true }
      const result = googleDocs.formatText('Hello', format)
      expect(result).toBe('***Hello***')
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete document workflow', () => {
      // Create user
      const user = googleDocs.createUser({
        id: 'workflow-user',
        email: 'workflow@example.com',
        name: 'Workflow User',
      })

      // Create document
      const document = googleDocs.createDocument({
        id: 'workflow-doc',
        title: 'Workflow Document',
        content: 'This is a workflow test document.',
        ownerId: 'workflow-user',
        collaborators: ['user1'],
        permissions: {
          canView: ['workflow-user', 'user1'],
          canEdit: ['workflow-user', 'user1'],
          canComment: ['workflow-user', 'user1'],
          canShare: ['workflow-user'],
        },
        isPublic: false,
        tags: ['workflow', 'test'],
      })

      // Create comment
      const comment = googleDocs.createComment({
        id: 'workflow-comment',
        documentId: 'workflow-doc',
        authorId: 'user1',
        content: 'Great document!',
        position: { start: 0, end: 10, line: 0, column: 0 },
      })

      // Create revision
      const revision = googleDocs.createRevision('workflow-doc', 'Original content', 'Updated content', 'workflow-user', 'Updated for workflow test')

      // Create share link
      const shareLink = googleDocs.createShareLink('workflow-doc', {
        canView: ['user2'],
        canEdit: [],
        canComment: ['user2'],
        canShare: [],
      })

      expect(user).toBeDefined()
      expect(document).toBeDefined()
      expect(comment).toBeDefined()
      expect(revision).toBeDefined()
      expect(shareLink).toBeDefined()

      // Verify document was updated
      const updatedDocument = googleDocs.getDocument('workflow-doc')
      expect(updatedDocument?.version).toBe(2)
    })

    it('should handle collaboration workflow', () => {
      // Add collaborator
      googleDocs.addCollaborator('doc1', 'user3', {
        canView: ['user3'],
        canEdit: ['user3'],
        canComment: ['user3'],
        canShare: [],
      })

      // Create comment from collaborator
      const comment = googleDocs.createComment({
        id: 'collab-comment',
        documentId: 'doc1',
        authorId: 'user3',
        content: 'Collaborator comment',
        position: { start: 0, end: 10, line: 0, column: 0 },
      })

      // Update document
      googleDocs.updateDocument('doc1', {
        content: 'Updated by collaborator',
      })

      expect(comment).toBeDefined()

      const document = googleDocs.getDocument('doc1')
      expect(document?.collaborators).toContain('user3')
      expect(document?.content).toBe('Updated by collaborator')
    })
  })

  describe('Event Handling', () => {
    it('should emit user created event', async () => {
      return new Promise<void>((resolve) => {
        googleDocs.on('userCreated', (user) => {
          expect(user.id).toBe('event-user')
          resolve()
        })

        googleDocs.createUser({
          id: 'event-user',
          email: 'event@example.com',
          name: 'Event User',
        })
      })
    })

    it('should emit document created event', async () => {
      return new Promise<void>((resolve) => {
        googleDocs.on('documentCreated', (document) => {
          expect(document.id).toBe('event-doc')
          resolve()
        })

        googleDocs.createDocument({
          id: 'event-doc',
          title: 'Event Document',
          content: 'Event test document',
          ownerId: 'user1',
          collaborators: [],
          permissions: {
            canView: ['user1'],
            canEdit: ['user1'],
            canComment: ['user1'],
            canShare: ['user1'],
          },
          isPublic: false,
          tags: ['event', 'test'],
        })
      })
    })

    it('should emit comment created event', async () => {
      return new Promise<void>((resolve) => {
        googleDocs.on('commentCreated', (comment) => {
          expect(comment.id).toBe('event-comment')
          resolve()
        })

        googleDocs.createComment({
          id: 'event-comment',
          documentId: 'doc1',
          authorId: 'user2',
          content: 'Event test comment',
          position: { start: 0, end: 10, line: 0, column: 0 },
        })
      })
    })

    it('should emit revision created event', async () => {
      return new Promise<void>((resolve) => {
        googleDocs.on('revisionCreated', (revision) => {
          expect(revision.documentId).toBe('doc1')
          resolve()
        })

        googleDocs.createRevision('doc1', 'Old content', 'New content', 'user1')
      })
    })

    it('should emit share link created event', async () => {
      return new Promise<void>((resolve) => {
        googleDocs.on('shareLinkCreated', (shareLink) => {
          expect(shareLink.documentId).toBe('doc1')
          resolve()
        })

        googleDocs.createShareLink('doc1', {
          canView: ['user2'],
          canEdit: [],
          canComment: ['user2'],
          canShare: [],
        })
      })
    })
  })
})
