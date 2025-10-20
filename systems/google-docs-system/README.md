# Google Docs System

A comprehensive collaborative document editing system with real-time collaboration, commenting, revision tracking, and sharing capabilities.

## Features

### User Management
- **User Creation**: Create users with profile information
- **User Updates**: Update user profiles and information
- **User Deletion**: Remove users and clean up associated data

### Document Management
- **Document Creation**: Create documents with rich content
- **Document Updates**: Edit document content and metadata
- **Document Deletion**: Remove documents and associated data
- **Version Control**: Track document versions and changes
- **Document Search**: Search documents by title, content, or tags

### Real-time Collaboration
- **Collaborator Management**: Add and remove collaborators
- **Permission Control**: Granular permissions for viewing, editing, commenting, and sharing
- **Live Updates**: Real-time document updates
- **Conflict Resolution**: Handle concurrent edits

### Comment System
- **Comment Creation**: Add comments to specific text positions
- **Comment Threading**: Organize comments by document
- **Comment Resolution**: Mark comments as resolved
- **Comment Updates**: Edit comment content

### Revision Tracking
- **Revision History**: Track all document changes
- **Change Tracking**: Detailed change information
- **Revision Restoration**: Restore previous versions
- **Revision Messages**: Add messages to revisions

### Sharing System
- **Share Links**: Create shareable links with custom permissions
- **Link Expiration**: Set expiration dates for share links
- **Access Tracking**: Track link access counts
- **Permission Management**: Control what shared users can do

### Text Formatting
- **Rich Text Support**: Bold, italic, underline, strikethrough
- **Font Styling**: Font size, family, and color
- **Background Colors**: Text background highlighting
- **Format Combinations**: Multiple formatting options

## Installation

```bash
npm install
```

## Usage

### Basic Setup

```typescript
import { GoogleDocsSystem } from './google-docs';

const googleDocs = new GoogleDocsSystem({
  maxDocumentSize: 1000000,
  maxCollaborators: 50,
  autoSaveInterval: 30000,
  maxRevisions: 100
});
```

### User Management

```typescript
// Create a user
const user = googleDocs.createUser({
  id: 'user1',
  email: 'john@example.com',
  name: 'John Doe'
});

// Get user
const user = googleDocs.getUser('user1');

// Update user
const updatedUser = googleDocs.updateUser('user1', {
  name: 'John Smith',
  email: 'johnsmith@example.com'
});

// Delete user
googleDocs.deleteUser('user1');
```

### Document Management

```typescript
// Create a document
const document = googleDocs.createDocument({
  id: 'doc1',
  title: 'Project Proposal',
  content: 'This is a comprehensive project proposal.',
  ownerId: 'user1',
  collaborators: ['user2'],
  permissions: {
    canView: ['user1', 'user2'],
    canEdit: ['user1', 'user2'],
    canComment: ['user1', 'user2', 'user3'],
    canShare: ['user1']
  },
  isPublic: false,
  tags: ['project', 'proposal', 'business']
});

// Get document
const document = googleDocs.getDocument('doc1');

// Update document
const updatedDocument = googleDocs.updateDocument('doc1', {
  title: 'Updated Project Proposal',
  content: 'Updated content with new information.'
});

// Delete document
googleDocs.deleteDocument('doc1');
```

### Comment System

```typescript
// Create a comment
const comment = googleDocs.createComment({
  id: 'comment1',
  documentId: 'doc1',
  authorId: 'user2',
  content: 'Great work on this section!',
  position: {
    start: 0,
    end: 10,
    line: 0,
    column: 0
  }
});

// Get comment
const comment = googleDocs.getComment('comment1');

// Update comment
const updatedComment = googleDocs.updateComment('comment1', {
  content: 'Updated comment'
});

// Resolve comment
googleDocs.resolveComment('comment1');

// Delete comment
googleDocs.deleteComment('comment1');
```

### Revision Management

```typescript
// Create a revision (automatically created on document update)
const revision = googleDocs.createRevision('doc1', 'Old content', 'New content', 'user1', 'Updated for review');

// Get revisions
const revisions = googleDocs.getRevisions('doc1');

// Restore revision
googleDocs.restoreRevision('doc1', 'revision-id');
```

### Sharing System

```typescript
// Create share link
const shareLink = googleDocs.createShareLink('doc1', {
  canView: ['user3'],
  canEdit: [],
  canComment: ['user3'],
  canShare: []
}, new Date('2024-12-31')); // Optional expiration

// Get share link
const shareLink = googleDocs.getShareLink('share-link-id');

// Access share link
const canAccess = googleDocs.accessShareLink('share-link-id');

// Delete share link
googleDocs.deleteShareLink('share-link-id');
```

### Collaboration

```typescript
// Add collaborator
googleDocs.addCollaborator('doc1', 'user3', {
  canView: ['user3'],
  canEdit: ['user3'],
  canComment: ['user3'],
  canShare: []
});

// Remove collaborator
googleDocs.removeCollaborator('doc1', 'user3');
```

### Search and Discovery

```typescript
// Search documents
const documents = googleDocs.searchDocuments('project proposal');

// Search documents for specific user
const userDocuments = googleDocs.searchDocuments('project', 'user1');

// Get document comments
const comments = googleDocs.getDocumentComments('doc1');

// Get user documents
const userDocs = googleDocs.getUserDocuments('user1');
```

### Text Formatting

```typescript
// Format text
const formatted = googleDocs.formatText('Hello World', {
  bold: true,
  italic: true,
  underline: true,
  strikethrough: false,
  fontSize: 16,
  fontFamily: 'Arial',
  color: '#000000',
  backgroundColor: '#ffff00'
});
```

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}
```

### Document
```typescript
interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  collaborators: string[];
  permissions: DocumentPermissions;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isPublic: boolean;
  tags: string[];
}
```

### Comment
```typescript
interface Comment {
  id: string;
  documentId: string;
  authorId: string;
  content: string;
  position: TextPosition;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Revision
```typescript
interface Revision {
  id: string;
  documentId: string;
  authorId: string;
  content: string;
  changes: Change[];
  createdAt: Date;
  message?: string;
}
```

### ShareLink
```typescript
interface ShareLink {
  id: string;
  documentId: string;
  url: string;
  permissions: DocumentPermissions;
  expiresAt?: Date;
  createdAt: Date;
  accessCount: number;
}
```

### TextPosition
```typescript
interface TextPosition {
  start: number;
  end: number;
  line: number;
  column: number;
}
```

### TextFormat
```typescript
interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
}
```

## Events

The GoogleDocsSystem extends EventEmitter and emits the following events:

### User Events
- `userCreated`: Emitted when a user is created
- `userUpdated`: Emitted when a user is updated
- `userDeleted`: Emitted when a user is deleted

### Document Events
- `documentCreated`: Emitted when a document is created
- `documentUpdated`: Emitted when a document is updated
- `documentDeleted`: Emitted when a document is deleted

### Comment Events
- `commentCreated`: Emitted when a comment is created
- `commentUpdated`: Emitted when a comment is updated
- `commentDeleted`: Emitted when a comment is deleted
- `commentResolved`: Emitted when a comment is resolved

### Revision Events
- `revisionCreated`: Emitted when a revision is created
- `revisionRestored`: Emitted when a revision is restored

### Share Events
- `shareLinkCreated`: Emitted when a share link is created
- `shareLinkAccessed`: Emitted when a share link is accessed
- `shareLinkDeleted`: Emitted when a share link is deleted

### Collaboration Events
- `collaboratorAdded`: Emitted when a collaborator is added
- `collaboratorRemoved`: Emitted when a collaborator is removed

## Configuration

### GoogleDocsOptions
```typescript
interface GoogleDocsOptions {
  maxDocumentSize?: number;      // Default: 1000000 (1MB)
  maxCollaborators?: number;     // Default: 50
  autoSaveInterval?: number;     // Default: 30000 (30 seconds)
  maxRevisions?: number;         // Default: 100
}
```

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes:
- Unit tests for all components
- Integration tests
- Event testing
- Error handling tests
- Performance tests

## Performance

The GoogleDocsSystem is designed for high performance:
- Efficient data structures using Maps
- Optimized search and filtering
- Event-driven architecture
- Minimal memory footprint
- Fast document operations

## License

MIT License
