# Newsfeed System

A comprehensive social media newsfeed system with user management, posts, comments, likes, follows, and real-time feed updates.

## Features

### User Management
- **User Creation**: Create users with profile information
- **User Updates**: Update user profiles and information
- **User Deletion**: Remove users and clean up associated data
- **User Search**: Search users by username, display name, or bio

### Post Management
- **Post Creation**: Create posts with content, media, and tags
- **Post Updates**: Edit post content and metadata
- **Post Deletion**: Remove posts and associated data
- **Post Search**: Search posts by content or tags
- **Media Support**: Attach media URLs to posts

### Comment System
- **Comment Creation**: Add comments to posts
- **Comment Updates**: Edit comment content
- **Comment Deletion**: Remove comments
- **Comment Threading**: Organize comments by post

### Like System
- **Post Likes**: Like and unlike posts
- **Comment Likes**: Like and unlike comments
- **Like Tracking**: Track who liked what

### Follow System
- **User Following**: Follow other users
- **Unfollow**: Stop following users
- **Feed Updates**: Automatic feed updates when following/unfollowing

### Feed Management
- **Personal Feed**: Get personalized feed based on followed users
- **User Posts**: Get posts from specific users
- **Pagination**: Support for paginated results
- **Real-time Updates**: Feed updates when new posts are created

### Discovery Features
- **Search**: Search posts and users
- **Trending Tags**: Get trending hashtags
- **Statistics**: System-wide statistics and metrics

## Installation

```bash
npm install
```

## Usage

### Basic Setup

```typescript
import { NewsfeedSystem } from './newsfeed';

const newsfeed = new NewsfeedSystem({
  maxPostsPerPage: 20,
  cacheSize: 1000,
  cacheTimeout: 300000
});
```

### User Management

```typescript
// Create a user
const user = newsfeed.createUser({
  id: 'user1',
  username: 'johndoe',
  email: 'john@example.com',
  displayName: 'John Doe',
  bio: 'Software developer'
});

// Get user
const user = newsfeed.getUser('user1');

// Update user
const updatedUser = newsfeed.updateUser('user1', {
  displayName: 'John Smith',
  bio: 'Senior software developer'
});

// Delete user
newsfeed.deleteUser('user1');
```

### Post Management

```typescript
// Create a post
const post = newsfeed.createPost({
  id: 'post1',
  authorId: 'user1',
  content: 'Just finished building an amazing feature! 🚀',
  tags: ['development', 'coding', 'tech'],
  mediaUrls: ['https://example.com/image.jpg'],
  isPublic: true
});

// Get post
const post = newsfeed.getPost('post1');

// Update post
const updatedPost = newsfeed.updatePost('post1', {
  content: 'Updated content',
  tags: ['updated', 'tech']
});

// Delete post
newsfeed.deletePost('post1');
```

### Comment System

```typescript
// Create a comment
const comment = newsfeed.createComment({
  id: 'comment1',
  postId: 'post1',
  authorId: 'user2',
  content: 'Great work! This looks amazing.'
});

// Get comment
const comment = newsfeed.getComment('comment1');

// Update comment
const updatedComment = newsfeed.updateComment('comment1', {
  content: 'Updated comment'
});

// Delete comment
newsfeed.deleteComment('comment1');
```

### Like System

```typescript
// Like a post
const like = newsfeed.likePost('user2', 'post1');

// Unlike a post
newsfeed.unlikePost('user2', 'post1');

// Like a comment
const like = newsfeed.likeComment('user1', 'comment1');

// Unlike a comment
newsfeed.unlikeComment('user1', 'comment1');
```

### Follow System

```typescript
// Follow a user
const follow = newsfeed.followUser('user1', 'user2');

// Unfollow a user
newsfeed.unfollowUser('user1', 'user2');
```

### Feed Management

```typescript
// Get user's personalized feed
const feed = newsfeed.getFeed('user1', 1); // page 1

// Get posts from a specific user
const userPosts = newsfeed.getUserPosts('user1', 1);

// Get comments for a post
const comments = newsfeed.getPostComments('post1', 1);
```

### Search and Discovery

```typescript
// Search posts
const posts = newsfeed.searchPosts('amazing feature', 1);

// Search users
const users = newsfeed.searchUsers('john');

// Get trending tags
const trending = newsfeed.getTrendingTags(10);
```

### Statistics

```typescript
// Get system statistics
const stats = newsfeed.getStatistics();
console.log(stats);
// {
//   totalUsers: 100,
//   totalPosts: 500,
//   totalComments: 1000,
//   totalLikes: 2000,
//   totalFollows: 300,
//   averagePostsPerUser: 5,
//   averageLikesPerPost: 4,
//   averageCommentsPerPost: 2
// }
```

## Events

The NewsfeedSystem extends EventEmitter and emits the following events:

### User Events
- `userCreated`: Emitted when a user is created
- `userUpdated`: Emitted when a user is updated
- `userDeleted`: Emitted when a user is deleted

### Post Events
- `postCreated`: Emitted when a post is created
- `postUpdated`: Emitted when a post is updated
- `postDeleted`: Emitted when a post is deleted

### Comment Events
- `commentCreated`: Emitted when a comment is created
- `commentUpdated`: Emitted when a comment is updated
- `commentDeleted`: Emitted when a comment is deleted

### Like Events
- `postLiked`: Emitted when a post is liked
- `postUnliked`: Emitted when a post is unliked
- `commentLiked`: Emitted when a comment is liked
- `commentUnliked`: Emitted when a comment is unliked

### Follow Events
- `userFollowed`: Emitted when a user follows another user
- `userUnfollowed`: Emitted when a user unfollows another user

## Data Models

### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Post
```typescript
interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  tags?: string[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}
```

### Comment
```typescript
interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Like
```typescript
interface Like {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  createdAt: Date;
}
```

### Follow
```typescript
interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}
```

## Configuration

### NewsfeedOptions
```typescript
interface NewsfeedOptions {
  maxPostsPerPage?: number;    // Default: 20
  cacheSize?: number;          // Default: 1000
  cacheTimeout?: number;       // Default: 300000 (5 minutes)
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

The NewsfeedSystem is designed for high performance:
- Efficient data structures using Maps
- Optimized feed generation
- Pagination support
- Event-driven architecture
- Minimal memory footprint

## License

MIT License
